import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { applyMigrations } from "./migrations";
import { createTauriPrismaClient } from "./pglite";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  __metaluMigrating?: Promise<void>;
};

// On the Tauri desktop runtime we boot PGlite empty — `prisma migrate deploy`
// can't talk to PGlite, so we apply SQL files directly via `applyMigrations`
// the first time anything touches the client. The Promise is memoised on
// `globalThis` so concurrent callers (e.g. multiple route handlers on first
// boot) share one migration run.
//
// Non-Tauri (dev/CI with a real Postgres) is unchanged: no migrations are
// auto-applied, the operator runs `prisma migrate deploy` as usual.
function ensureTauriMigrated(): Promise<void> {
  if (process.env.METALU_RUNTIME !== "tauri") return Promise.resolve();
  if (!globalForPrisma.__metaluMigrating) {
    globalForPrisma.__metaluMigrating = applyMigrations().catch((err) => {
      // Reset so a later request can retry once the operator fixes the cause.
      globalForPrisma.__metaluMigrating = undefined;
      console.error("[prisma] tauri migrations failed:", err);
      throw err;
    });
  }
  return globalForPrisma.__metaluMigrating;
}

function createPrismaClient(): PrismaClient {
  if (process.env.METALU_RUNTIME === "tauri") {
    // Fire-and-forget the migration kick — route handlers in /api/health
    // (and the rest) await `waitForTauriReady` before their first query.
    void ensureTauriMigrated();
    return createTauriPrismaClient();
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Explicit gate for route handlers that must not return a 200 until pending
 * migrations have run (e.g. `/api/health`, which the Tauri Rust shell polls
 * to decide when to open the webview).
 */
export async function waitForTauriReady(): Promise<void> {
  await ensureTauriMigrated();
}
