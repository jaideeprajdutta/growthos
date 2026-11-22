import { expect, test } from "@playwright/test";
import {
  activateCompany,
  getEvidenceList,
  getOpportunities,
  linkEvidence,
  seedCompany,
  seedEvidence,
  seedOpportunity,
} from "./api";
import { authHeaders } from "./auth-state";

test.use({ viewport: { width: 1280, height: 900 } });

test("lists opportunities with readable status labels and deterministic priority", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Opportunities ${Date.now()}`);
  await activateCompany(request, company.id);
  const opportunity = await seedOpportunity(request, company.id, { title: "E2E Launch the beta", confidence: 80, effort: 3, status: "proposed" });

  await page.goto("/opportunities");
  await expect(page.getByRole("table")).toContainText("E2E Launch the beta");
  await expect(page.getByRole("table")).toContainText("Proposed");
  await expect(page.getByRole("table")).toContainText("80%");
  await expect(page.getByRole("table")).toContainText("3");

  // The status transition API computes the deterministic score:
  // round(80*0.4) + round((10-3)*0.3) + bonus(approved=10) = 32 + 21 + 10 = 63.
  const response = await request.put(`http://localhost:8301/api/v1/companies/${company.id}/opportunities/${opportunity.id}/status`, {
    headers: authHeaders(),
    data: { status: "approved" },
  });
  expect(response.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Approved");
  await expect(page.getByRole("table")).toContainText("63");
});

test("updates the opportunity status through the UI and persists it", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Status ${Date.now()}`);
  await activateCompany(request, company.id);
  const opportunity = await seedOpportunity(request, company.id, { title: "E2E Status opp", status: "proposed" });

  await page.goto("/opportunities");
  await page.getByRole("button", { name: `View ${opportunity.title}` }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const statusSelect = dialog.locator("select");
  await expect(statusSelect).toHaveValue("proposed");
  await statusSelect.selectOption("approved");
  await dialog.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Status updated to approved.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).last().click();

  // Persistence after reload.
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Approved");
});

test("creates an experiment from the opportunity detail", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Experiment ${Date.now()}`);
  await activateCompany(request, company.id);
  const opportunity = await seedOpportunity(request, company.id, { title: "E2E Experiment opp" });

  await page.goto("/opportunities");
  await page.getByRole("button", { name: `View ${opportunity.title}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Create experiment" }).click();
  await expect(dialog.getByRole("table")).toBeVisible();
  // The handoff experiment inherits the opportunity title as its hypothesis.
  await expect(dialog.getByRole("table")).toContainText("E2E Experiment opp");
});

test("shows linked evidence on the opportunity detail", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Evidence ${Date.now()}`);
  await activateCompany(request, company.id);
  const statement = "E2E proof statement about the launch cadence of the company.";
  const evidenceId = seedEvidence(request, company.id, { url: "https://e2e.example/proof", statement });
  const opportunity = await seedOpportunity(request, company.id, { title: "E2E Evidence opp" });
  await linkEvidence(request, company.id, opportunity.id, [evidenceId]);

  // The evidence API includes the linked record.
  const evidenceList = await getEvidenceList(request, company.id);
  expect(evidenceList.map((item) => item.id)).toContain(evidenceId);

  await page.goto("/opportunities");
  await page.getByRole("button", { name: `View ${opportunity.title}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Supporting evidence")).toBeVisible();
  await expect(dialog).toContainText(statement);
});

test("duplicate opportunity submissions are allowed and recorded separately", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Duplicate ${Date.now()}`);
  await activateCompany(request, company.id);
  await seedOpportunity(request, company.id, { title: "E2E Dup seeded" });

  await page.goto("/opportunities");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Record opportunity" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[name="title"]').first().fill("E2E Dup opp");
    await dialog.getByRole("button", { name: "Record opportunity" }).first().click({ timeout: 15_000 });
  }
  // Both submissions are recorded as separate opportunities (duplicates are allowed).
  const opportunities = await getOpportunities(request, company.id);
  const duplicates = opportunities.filter((opportunity) => opportunity.title === "E2E Dup opp");
  expect(duplicates.length).toBeGreaterThanOrEqual(2);
});

test("opportunity lists surface API errors", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E API Error ${Date.now()}`);
  await activateCompany(request, company.id);
  await seedOpportunity(request, company.id, { title: "E2E API Error opp" });

  await page.goto("/opportunities");
  await expect(page.getByText("E2E API Error opp")).toBeVisible();

  await page.route("**/api/v1/companies/**/opportunities", (route) => route.abort());
  await page.reload();
  await expect(page.getByText("Couldn't load opportunities")).toBeVisible();
});

test("generate-opportunities control surfaces the AI requirement when unavailable", async ({ page, request }) => {
  const company = await seedCompany(request, `E2E Generate ${Date.now()}`);
  await activateCompany(request, company.id);
  await seedOpportunity(request, company.id, { title: "E2E Generate seeded" });

  await page.goto("/opportunities");
  await expect(page.getByText(/Generated opportunities use AI analysis/)).toBeVisible();
  await page.getByRole("button", { name: /Generate opportunities/ }).click();
  await expect(page.getByText(/Could not generate opportunities/)).toBeVisible();
});

test("opportunity data is isolated per company", async ({ page, request }) => {
  const companyA = await seedCompany(request, `E2E Iso A ${Date.now()}`);
  const companyB = await seedCompany(request, `E2E Iso B ${Date.now()}`);
  await seedOpportunity(request, companyA.id, { title: "E2E Iso opp A" });
  await seedOpportunity(request, companyB.id, { title: "E2E Iso opp B" });

  await activateCompany(request, companyA.id);
  await page.goto("/opportunities");
  await expect(page.getByText("E2E Iso opp A")).toBeVisible();
  await expect(page.getByText("E2E Iso opp B")).toHaveCount(0);

  // Switch companies: the page reflects the newly active company's data.
  await activateCompany(request, companyB.id);
  await page.goto("/opportunities");
  await expect(page.getByText("E2E Iso opp B")).toBeVisible();
  await expect(page.getByText("E2E Iso opp A")).toHaveCount(0);
});
