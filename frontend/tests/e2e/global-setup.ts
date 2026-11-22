import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { request, type APIRequestContext } from "@playwright/test";

const BACKEND_DIR = path.resolve(__dirname, "../../../backend");
const E2E_DB = path.join(BACKEND_DIR, "e2e.db");
const STORAGE_PATH = path.resolve(__dirname, "../../test-results/e2e-storage.json");
const FRONTEND = "http://localhost:3101";
const API = "http://localhost:8301/api/v1";

const GLOBAL_KEY = "__GPE_E2E_BACKEND_CHILD__";

async function writeBrowserStorage(context: APIRequestContext): Promise<void> {
  const credentials = {
    email: "e2e@growthos.test",
    password: "E2EPassword123!",
    displayName: "E2E Pilot",
  };
  let response = await context.post(`${API}/auth/register`, { data: credentials });
  if (response.status() === 409) {
    response = await context.post(`${API}/auth/login`, {
      data: { email: credentials.email, password: credentials.password },
    });
  }
  if (!response.ok()) throw new Error(`E2E authentication failed with ${response.status()}: ${await response.text()}`);
  const { token } = (await response.json()) as { token: string };

  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  fs.writeFileSync(
    STORAGE_PATH,
    JSON.stringify({
      cookies: [],
      origins: [{ origin: FRONTEND, localStorage: [{ name: "growthos_token", value: token }] }],
    }),
    "utf8"
  );
}

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
        const response = await context.get(`${API}/health`);
        if (response.ok()) {
          await writeBrowserStorage(context);
          return;
        }
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
