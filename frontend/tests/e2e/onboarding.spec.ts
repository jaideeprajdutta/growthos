import { expect, test } from "@playwright/test";

test("rejects invalid submissions and creates a company", async ({ page }) => {
  await page.goto("/companies/onboarding");
  await expect(page.getByText("Add a company")).toBeVisible();

  // Invalid submission: empty company name blocks the form.
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page.getByText("Company name is required.")).toBeVisible();

  // Invalid submission: malformed website URL.
  await page.getByLabel("Company name").fill("E2E Onboarding Co");
  await page.getByLabel("Website").fill("not-a-url");
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page.getByText("Enter a valid website URL, e.g. https://example.com")).toBeVisible();

  // Valid flow: step through and confirm.
  await page.getByLabel("Website").fill("https://e2e-onboarding.example");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Next" }).first().click();
  }
  await page.getByRole("button", { name: "Confirm and create company" }).click();
  await expect(page).toHaveURL(new RegExp("/companies/[a-f0-9-]{36}$"));
  await expect(page.getByText("Company created")).toBeVisible();
});
