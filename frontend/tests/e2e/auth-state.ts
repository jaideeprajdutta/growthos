/** Reads the token created by global setup so API-seeded E2E data is authenticated. */

import fs from "node:fs";
import path from "node:path";

const FRONTEND_ORIGIN = "http://localhost:3101";
const STORAGE_PATH = path.resolve(__dirname, "../../test-results/e2e-storage.json");

interface StorageState {
  origins?: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

let cachedToken: string | null = null;

export function getE2EToken(): string {
  if (cachedToken) return cachedToken;
  const state = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf8")) as StorageState;
  const origin = state.origins?.find((item) => item.origin === FRONTEND_ORIGIN);
  const token = origin?.localStorage.find((item) => item.name === "growthos_token")?.value;
  if (!token) throw new Error("E2E authentication token is missing. Check global setup.");
  cachedToken = token;
  return token;
}

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getE2EToken()}` };
}
