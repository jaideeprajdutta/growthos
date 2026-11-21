import { expect, test } from "@playwright/test";
import { activateCompany, seedCompany, seedOpportunity } from "./api";

test("opportunity data is isolated per company", async ({ page, request }) => {
  const companyA = await seedCompany(request, `E2E Iso A ${Date.now()}`);
  const companyB = await seedCompany(request, `E2E Iso B ${Date.now()}`);
  await seedOpportunity(request, companyA.id, { title: "E2E Iso opp A" });
  await seedOpportunity(request, companyB.id, { title: "E2E Iso opp B" });

  await activateCompany(request, companyA.id);
  await page.goto("/opportunities");
  await expect(page.getByText("E2E Iso opp A")).toBeVisible();
  await expect(page.getByText("E2E Iso opp B")).toHaveCount(0);

  // Switch companies: the shell selector navigates to the other company's data.
  await activateCompany(request, companyB.id);
  await page.goto("/opportunities");
  await expect(page.getByText("E2E Iso opp B")).toBeVisible();
  await expect(page.getByText("E2E Iso opp A")).toHaveCount(0);
});
