import { expect, test } from "@playwright/test";
import { seedCompany, activateCompany, runSeed } from "./api";

test("shows a clear error when the backend is unavailable at load time", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/opportunities");
  await expect(page.getByText("Couldn't load the workspace")).toBeVisible();
});

test("keeps the research panel state when polling fails (backend unavailable)", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Backend Offline ${Date.now()}`);
  await activateCompany(request, company.id);
  await runSeed(["run", "--company-id", company.id, "--status", "running", "--pages", "1"]);

  await page.goto("/bi");
  await expect(page.getByText("updating automatically…")).toBeVisible();

  await page.route("**/api/v1/companies/**/research/runs", (route) => route.abort());
  await page.waitForTimeout(6000);
  await expect(page.getByText("Website research")).toBeVisible();
  await expect(page.getByText("running")).toBeVisible();
});

test("seeds no research for companies without research", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Research None ${Date.now()}`);
  await activateCompany(request, company.id);
  await page.goto("/bi");
  await expect(page.getByText("No research yet")).toBeVisible();
});
