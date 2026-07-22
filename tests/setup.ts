// Global test setup. Runs before every test file (see vitest.config.ts
// `setupFiles`). Individual tests can override these env vars in their own
// `beforeAll` if they need different behaviour.

process.env.METALU_RUNTIME ??= "tauri";
process.env.AUTH_SECRET ??= "test-secret-not-for-production";

export {};
