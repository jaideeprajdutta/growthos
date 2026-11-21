import { expect, test } from "@playwright/test";
import { seedCompany, activateCompany } from "./api";

const NAV_LINKS = [
  ["Overview", "/"],
  ["Companies", "/companies"],
  ["Business Intelligence", "/bi"],
  ["Growth Diagnosis", "/diagnosis"],
  ["Opportunities", "/opportunities"],
  ["Experiments", "/experiments"],
  ["Execution", "/execution"],
  ["Analytics", "/analytics"],
  ["Integrations", "/integrations"],
  ["Settings", "/settings"],
] as const;

test.describe("Application shell", () => {
  test("renders the app, the company selector and all sidebar pages", async ({ page, request }) => {
    const company = await seedCompany(request, `E2E Shell ${Date.now()}`);
    await activateCompany(request, company.id);

    await page.goto("/");
    await expect(page).toHaveTitle(/GrowthOS/);
    await expect(page.getByLabel("Select company").first()).toBeVisible();
    await expect(page.getByLabel("Select company").first()).toContainText(company.name);

    for (const [label, pathName] of NAV_LINKS) {
      const link = page.getByLabel("Main navigation").getByRole("link", { name: label });
      await expect(link, `sidebar link ${label}`).toBeVisible();
      await link.click();
      await expect(page, `after navigating to ${label}`).toHaveURL(new RegExp(`${pathName === "/" ? "/$" : pathName}$`));
    }

    // Company selection is persisted via the shell selector.
    await page.goto("/");
    await expect(page.getByLabel("Select company").first()).toHaveValue(company.id);
  });

  test("selects the active company from the shell selector", async ({ page, request }) => {
    const a = await seedCompany(request, `E2E Shell A ${Date.now()}`);
    const b = await seedCompany(request, `E2E Shell B ${Date.now()}`);
    await activateCompany(request, a.id);

    await page.goto("/");
    await expect(page.getByLabel("Select company").first()).toHaveValue(a.id);

    await page.getByLabel("Select company").first().selectOption(b.id);
    await expect(page).toHaveURL(new RegExp(`companies/${b.id}$`));
  });

  test("shows data for the active company on the companies page", async ({ page, request }) => {
    const company = await seedCompany(request, `E2E Companies Page ${Date.now()}`);
    await activateCompany(request, company.id);
    await page.goto("/companies");
    await expect(page.getByRole("heading", { name: company.name })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: company.name })).toBeVisible();
  });
});
