import { expect, test } from "@playwright/test";
import { seedCompany, activateCompany } from "./api";

test("mobile layout renders pages and opens the navigation drawer", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Mobile ${Date.now()}`);
  await activateCompany(request, company.id);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/opportunities");
  await expect(page.getByRole("heading", { name: "Opportunities" })).toBeVisible();

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Navigation" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Growth Diagnosis" }).click();
  await expect(page).toHaveURL(new RegExp("/diagnosis$"));
  await expect(page.getByRole("heading", { name: "Growth Diagnosis" })).toBeVisible();

  // The desktop sidebar is hidden on mobile; the drawer navigates fine.
  await expect(page.getByLabel("Main navigation")).toHaveCSS("display", "none");
});
