import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { request } from "@playwright/test";

const BACKEND_DIR = path.resolve(__dirname, "../../../backend");
const E2E_DB = path.join(BACKEND_DIR, "e2e.db");

const GLOBAL_KEY = "__GPE_E2E_BACKEND_CHILD__";

export default async function globalSetup(): Promise<void> {
  // Start from a fresh, isolated E2E database — never the development or production database.
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    fs.rmSync(E2E_DB + suffix, { force: true });
  }

  const python = fs.existsSync(path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe"))
    ? path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    : "python";
  const backend = spawn(python, ["-m", "uvicorn", "app.main:app", "--port", "8301", "--log-level", "warning"], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      DATABASE_URL: "sqlite:///e2e.db",
      CORS_ORIGINS: "http://localhost:3101,http://localhost:3000",
      LOG_LEVEL: "warning",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  backend.stdout?.on("data", (chunk: Buffer) => process.stdout.write(`[e2e-backend] ${chunk}`));
  backend.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[e2e-backend] ${chunk}`));
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = backend;

  const context = await request.newContext();
  try {
    const deadline = Date.now() + 120_000;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        const response = await context.get("http://localhost:8301/api/v1/health");
        if (response.ok()) return;
      } catch (err) {
        lastError = err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Backend did not become ready on http://localhost:8301: ${lastError ?? "unknown error"}`);
  } finally {
    await context.dispose();
  }
}
