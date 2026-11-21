import type { ChildProcess } from "node:child_process";

const GLOBAL_KEY = "__GPE_E2E_BACKEND_CHILD__";

function getChild(): ChildProcess | undefined {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as ChildProcess | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const child = getChild();
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.killed) return resolve();
    child.once("exit", () => resolve());
    setTimeout(() => {
      if (!child.killed && child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 3_000);
  });
}
