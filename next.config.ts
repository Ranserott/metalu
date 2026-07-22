import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // PGlite is Postgres compiled to WASM via emscripten. When webpack bundles
  // it into .next/server/, the polyfilled URL class fails Node.js fs's
  // `instanceof URL` check, throwing ERR_INVALID_ARG_TYPE on every Prisma
  // query. `pglite-prisma-adapter` shares the same dependency tree and has
  // to be externalized together. Both packages stay as native Node.js
  // requires so PKG can include their node_modules via pkg.assets.
  serverExternalPackages: [
    "@electric-sql/pglite",
    "pglite-prisma-adapter",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep the standalone bundle's internal layout matching the project root so
  // PKG can find src/server/entry.js and other paths without nested absolute
  // prefixes. Without this, Next.js uses the absolute filesystem path of the
  // repo, producing things like .next/standalone/<abs-path>/server.js.
  //
  // NOTE: do NOT add `turbopack: { root: process.cwd() }` here. In Next.js 16
  // the turbopack config is applied even when building with --webpack, and it
  // breaks alias resolution (`@/*` fails with "Module not found: Can't resolve
  // '@/modules/...'"). If you need turbopack root, set it via the CLI flag or
  // a separate dev config.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
