import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // PGlite sobe um Postgres em WASM por teste: a primeira migração é lenta.
  test: { include: ["src/**/*.test.ts", "tests/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
