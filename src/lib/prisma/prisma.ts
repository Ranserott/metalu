import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { applyMigrations } from "./migrations";
import { createTauriPrismaClient } from "./pglite";
import { seedDefaultData } from "./seedDefaultData";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  __metaluReady?: Promise<void>;
};

// On the Tauri desktop runtime we boot PGlite empty. Apply schema migrations
// and required default data before route handlers issue their first query.
function ensureTauriReady(client: PrismaClient): Promise<void> {
  if (process.env.METALU_RUNTIME !== "tauri") return Promise.resolve();
  if (!globalForPrisma.__metaluReady) {
    globalForPrisma.__metaluReady = applyMigrations()
      .then(() => seedDefaultData(client))
      .catch((err) => {
        globalForPrisma.__metaluReady = undefined;
        console.error("[prisma] tauri initialization failed:", err);
        throw err;
      });
  }
  return globalForPrisma.__metaluReady;
}

function createPrismaClient(): PrismaClient {
  if (process.env.METALU_RUNTIME === "tauri") {
    const client = createTauriPrismaClient();
    void ensureTauriReady(client);
    return client;
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
  await ensureTauriReady(prisma);
}
