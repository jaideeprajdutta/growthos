import { expect, test } from "@playwright/test";
import { seedCompany, seedFinding, activateCompany } from "./api";

const PHASES = ["Discovery", "Acquisition", "Activation", "Conversion", "Retention", "Expansion", "Referral"];

test("maps the seven growth phases, shows findings, surfaces the AI requirement", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Diagnosis ${Date.now()}`);
  await activateCompany(request, company.id);
  await seedFinding(request, company.id, {
    dimension: "conversion",
    problem: "Checkout drops off before payment.",
    severity: 4,
    category: "confirmed_issue",
  });

  await page.goto("/diagnosis");
  for (const phase of PHASES) {
    await expect(page.getByRole("heading", { name: phase }), `phase ${phase}`).toBeVisible();
  }

  // The seeded finding is rendered inside the Conversion phase card (and the findings list).
  await expect(page.getByText("Checkout drops off before payment.").first()).toBeVisible();

  // The page discloses that diagnostics need AI analysis, and generation
  // fails with a clear message while no AI provider is configured.
  await expect(page.getByText(/AI provider/)).toBeVisible();
  await page.getByRole("button", { name: /Run diagnosis/ }).click();
  await expect(page.getByText(/Diagnostics could not be run/)).toBeVisible();
});
