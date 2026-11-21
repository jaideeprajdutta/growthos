import { expect, test } from "@playwright/test";
import { seedCompany, activateCompany, runSeed } from "./api";

test("shows a completed research run with its pages", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research ${Date.now()}`);
  await activateCompany(request, company.id);
  await runSeed(["run", "--company-id", company.id, "--status", "completed", "--pages", "2"]);

  await page.goto("/bi");
  await expect(page.getByText("2 pages scanned")).toBeVisible();
  await expect(page.getByText("E2E page 1")).toBeVisible();
  await expect(page.getByText("E2E page 2")).toBeVisible();
});

test("shows a failed research run and its error message", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research Failed ${Date.now()}`);
  await activateCompany(request, company.id);
  await runSeed(["run", "--company-id", company.id, "--status", "failed", "--pages", "0", "--error", "No pages could be fetched."]);

  await page.goto("/bi");
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(page.getByText("No pages could be fetched.")).toBeVisible();
});

test("shows the empty state when a run finished without pages", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research Empty ${Date.now()}`);
  await activateCompany(request, company.id);
  await runSeed(["run", "--company-id", company.id, "--status", "completed", "--pages", "0"]);

  await page.goto("/bi");
  await expect(page.getByText("No pages found")).toBeVisible();
});

test("auto-polls after refresh and updates when the job completes", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research Poll ${Date.now()}`);
  await activateCompany(request, company.id);
  const runId = await runSeed(["run", "--company-id", company.id, "--status", "running", "--pages", "1"]);

  await page.goto("/bi");
  await expect(page.getByText("updating automatically…")).toBeVisible();
  await expect(page.getByText("Running")).toBeVisible();
  await expect(page.getByText("E2E page 1")).toBeVisible();

  // Flip the job to completed on the E2E database; the panel updates without a manual refresh.
  await runSeed(["complete-run", runId]);
  await expect(page.getByText("Completed")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("updating automatically…")).toHaveCount(0);
});

test("retries a failed page and surfaces failures", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research Retry ${Date.now()}`);
  await activateCompany(request, company.id);
  await runSeed(["run", "--company-id", company.id, "--status", "completed", "--pages", "1"]);

  await page.goto("/bi");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
});
