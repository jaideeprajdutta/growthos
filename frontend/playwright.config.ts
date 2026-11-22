import { defineConfig } from "@playwright/test";

const BACKEND = "http://localhost:8301";
const FRONTEND = "http://localhost:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: FRONTEND, storageState: "./test-results/e2e-storage.json" },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  webServer: {
    command: "npm run dev -- --port 3101",
    url: FRONTEND,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_BASE_URL: BACKEND,
      CORS_ORIGINS: "http://localhost:3101,http://localhost:3000",
      LOG_LEVEL: "warning",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
