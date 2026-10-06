import { defineConfig } from "@playwright/test";

/** E2E local: `npm run build && npm run test:e2e` (sobe o app e usa um banco PGlite descartável). */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    env: { PGLITE_DIR: ".data/e2e-pglite" },
  },
});
