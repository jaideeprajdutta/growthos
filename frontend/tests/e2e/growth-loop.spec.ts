import { expect, test, type APIRequestContext } from "@playwright/test";
import { activateCompany, seedCompany, seedEvidence, seedOpportunity } from "./api";

const API = "http://localhost:8301/api/v1";
const CSV = `baseline,observed,target,direction,measurement_start,measurement_end,source_name,notes
10,8,9,decrease,2026-11-01T00:00:00Z,2026-11-07T00:00:00Z,CSV export,Week one
`;

async function apiGet<T>(request: APIRequestContext, pathName: string): Promise<T> {
  const response = await request.get(`${API}${pathName}`);
  expect(response.ok(), `GET ${pathName} failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

test.describe("Phase 3 growth loop", () => {
  test("runs an experiment from creation through learning and feedback", async ({ page, request }) => {
    test.setTimeout(120_000);
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    const stamp = Date.now();
    const company = await seedCompany(request, `E2E Growth Loop ${stamp}`);
    await activateCompany(request, company.id);
    const opportunityTitle = `Improve onboarding activation ${stamp}`;
    const opportunity = await seedOpportunity(request, company.id, {
      title: opportunityTitle,
      confidence: 80,
      effort: 3,
      status: "approved",
    });
    seedEvidence(request, company.id, {
      url: "https://example.test/activation-report",
      statement: "Activation report for the manual measurement window.",
      title: "Manual activation report",
    });

    const experimentName = `Checklist simplification ${stamp}`;

    await page.goto("/experiments");
    await page.getByRole("button", { name: "Add experiment" }).first().click();
    const createDialog = page.getByRole("dialog", { name: "Add experiment" });
    await createDialog.getByLabel("Experiment name").fill(experimentName);
    await createDialog.getByLabel("Owner").fill("Growth Lead");
    await createDialog.getByLabel("Description").fill("Test a shorter setup checklist against the current flow.");
    await createDialog.getByLabel("Hypothesis").fill("A shorter checklist increases activation.");
    await createDialog.getByLabel("Problem").fill("Users abandon during setup.");
    await createDialog.getByLabel("Intervention").fill("Remove two optional steps from the first-run checklist.");
    await createDialog.getByLabel("Target audience").fill("New trial users");
    await createDialog.getByLabel("Success metric").fill("Activation rate");
    await createDialog.getByLabel("Baseline", { exact: true }).fill("40%");
    await createDialog.getByLabel("Target", { exact: true }).fill("50%");
    await createDialog.getByLabel("Guardrail metrics").fill("Support tickets, Refund rate");
    await createDialog.getByLabel("Start date").fill("2026-11-10");
    await createDialog.getByLabel("End date").fill("2026-11-24");
    await createDialog.getByLabel("Linked opportunity").selectOption({ label: opportunityTitle });
    await createDialog.getByRole("button", { name: "Add experiment" }).click();

    await expect(page.getByText("Experiment created")).toBeVisible();
    await page.getByRole("link", { name: `Open ${experimentName}` }).click();
    await expect(page.getByRole("heading", { name: experimentName, level: 1 })).toBeVisible();
    await expect(page.getByText("A shorter checklist increases activation.").first()).toBeVisible();

    const experimentId = new URL(page.url()).pathname.split("/").pop() ?? "";
    expect(experimentId).not.toBe("");
    const experimentApi = `/companies/${company.id}/experiments/${experimentId}`;

    // Approval is a validated lifecycle step: a proposed experiment cannot be started.
    await expect(page.getByRole("button", { name: "Start experiment" })).toHaveCount(0);
    await page.getByRole("button", { name: "Approve experiment" }).click();
    const approveDialog = page.getByRole("dialog", { name: "Approve experiment" });
    await approveDialog.getByLabel("Note (optional)").fill("Approved in the weekly growth review");
    await approveDialog.getByRole("button", { name: "Confirm Approve" }).click();
    await expect(page.getByText("Experiment approved")).toBeVisible();

    await page.getByRole("button", { name: "Start experiment" }).click();
    const startDialog = page.getByRole("dialog", { name: "Start experiment" });
    await startDialog.getByRole("button", { name: "Confirm Start" }).click();
    await expect(page.getByText("Experiment started")).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete experiment" })).toBeVisible();

    async function addTask(title: string, owner: string, requiresApproval: boolean) {
      await page.getByRole("button", { name: "Add task", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Add execution task" });
      await dialog.getByLabel("Task").fill(title);
      await dialog.getByLabel("Notes").fill("Recorded from the execution plan.");
      await dialog.getByLabel("Owner").fill(owner);
      const approval = dialog.getByRole("checkbox", { name: "Require explicit approval before work starts" });
      if (requiresApproval) await approval.check();
      else await approval.uncheck();
      await dialog.getByRole("button", { name: "Add task" }).click();
    }

    await addTask("Ship updated checklist", "Product", true);
    await addTask("Notify support team", "CS", false);
    const gatedRow = page.getByRole("row").filter({ hasText: "Ship updated checklist" });
    const manualRow = page.getByRole("row").filter({ hasText: "Notify support team" });
    await expect(gatedRow.locator("td").nth(4)).toContainText("Pending");
    await expect(manualRow.locator("td").nth(4)).toContainText("Not required");

    // The UI offers the action, but the backend refuses it until approval is explicit.
    await gatedRow.getByRole("button", { name: "Start task" }).click();
    await expect(page.getByText("This task needs explicit approval before work can start.")).toBeVisible();
    await expect(gatedRow.locator("td").nth(3)).toContainText("Pending");

    await gatedRow.getByRole("button", { name: "Approve task" }).click();
    await expect(page.getByText("Task approved")).toBeVisible();
    await gatedRow.getByRole("button", { name: "Start task" }).click();
    await expect(gatedRow.getByText("In Progress")).toBeVisible();

    await gatedRow.getByRole("button", { name: "Add task note" }).click();
    const noteDialog = page.getByRole("dialog", { name: "Add a task note" });
    await noteDialog.getByRole("textbox", { name: "Note" }).fill("Deployed the two-step checklist to the treatment group.");
    await noteDialog.getByRole("checkbox", { name: /Manual activation report/ }).check();
    await noteDialog.getByRole("button", { name: "Save task note" }).click();
    await expect(gatedRow).toContainText("2 notes · 1 evidence link");

    await gatedRow.getByRole("button", { name: "Complete task" }).click();
    await expect(gatedRow.getByText("Completed", { exact: true })).toBeVisible();
    await manualRow.getByRole("button", { name: "Start task" }).click();
    await manualRow.getByRole("button", { name: "Complete task" }).click();
    await expect(manualRow.getByText("Completed", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add measurement" }).click();
    const measurementDialog = page.getByRole("dialog", { name: "Record a measurement" });
    await measurementDialog.getByLabel("Baseline value").fill("100");
    await measurementDialog.getByLabel("Observed value").fill("126");
    await measurementDialog.getByLabel("Target value").fill("125");
    await measurementDialog.getByLabel("Outcome description").fill("Activation events reached 126 in the treatment window.");
    await measurementDialog.getByLabel("Data source").selectOption("estimate");
    await measurementDialog.getByLabel("Source name").fill("Activation dashboard screenshot");
    await measurementDialog.getByLabel("Measurement notes").fill("Manual read at the end of the window.");
    await measurementDialog.getByLabel("Interpretation").fill("Observed value exceeded the recorded target.");
    await measurementDialog.getByRole("button", { name: "Save measurement" }).click();

    const estimateRow = page.getByRole("row").filter({ hasText: "100 → 126" });
    await expect(estimateRow).toContainText("+26");
    await expect(estimateRow).toContainText("104%");
    await expect(estimateRow).toContainText("Target met");
    await expect(estimateRow.getByText("Estimate", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Import measurements from CSV" }).click();
    const csvDialog = page.getByRole("dialog", { name: "Import measurements from CSV" });
    await csvDialog.getByLabel("CSV data").fill(CSV);
    await csvDialog.getByRole("button", { name: "Preview CSV" }).click();
    await expect(csvDialog.getByText("1 valid row ready to import.")).toBeVisible();
    await expect(csvDialog.getByText("Week one")).toBeVisible();

    const beforeImport = await apiGet<unknown[]>(request, `${experimentApi}/results`);
    expect(beforeImport).toHaveLength(1);

    await csvDialog.getByRole("button", { name: "Import 1 rows" }).click();
    await expect(csvDialog).toHaveCount(0);
    const importedRow = page.getByRole("row").filter({ hasText: "10 → 8" });
    await expect(importedRow.getByText("Imported", { exact: true })).toBeVisible();
    await expect(importedRow).toContainText("200%");

    await page.getByRole("button", { name: "Complete experiment" }).click();
    const completeDialog = page.getByRole("dialog", { name: "Complete experiment" });
    await completeDialog.getByLabel("Note (optional)").fill("Measurement window closed");
    await completeDialog.getByRole("button", { name: "Confirm Complete" }).click();
    await expect(page.getByText("Experiment completed")).toBeVisible();

    await page.getByRole("button", { name: "Record outcome review" }).click();
    const reviewDialog = page.getByRole("dialog", { name: "Record outcome review" });
    await reviewDialog.getByLabel("Outcome", { exact: true }).selectOption("successful");
    await reviewDialog.getByLabel("Target met").selectOption("true");
    await reviewDialog.getByLabel("What changed?").fill("Activation rose from 40% to 50.4% with no support increase.");
    await reviewDialog.getByLabel("What worked?").fill("Removing optional steps reduced hesitation.");
    await reviewDialog.getByLabel("What did not work?").fill("The welcome email was not changed.");
    await reviewDialog.getByLabel("Next step").fill("Roll out to all new users and monitor for two weeks.");
    await reviewDialog.getByRole("button", { name: "Save outcome review" }).click();
    await expect(page.getByText("Outcome review recorded")).toBeVisible();
    await expect(page.getByText("Activation rose from 40% to 50.4% with no support increase.")).toBeVisible();

    const persisted = await apiGet<{
      experiment: { status: string; outcome: string; decisionHistory: unknown[] };
      tasks: { status: string; approvalStatus: string; executedBy: string | null }[];
      results: { dataSource: string; targetAttainmentPct: number }[];
      learning: { outcome: string } | null;
    }>(request, experimentApi);
    expect(persisted.experiment.status).toBe("completed");
    expect(persisted.experiment.outcome).toBe("successful");
    expect(persisted.experiment.decisionHistory).toHaveLength(4);
    expect(persisted.tasks).toHaveLength(2);
    expect(persisted.tasks.every((task) => task.status === "completed" && task.executedBy === "Local User")).toBeTruthy();
    expect(persisted.results.map((result) => result.dataSource)).toEqual(["imported", "estimate"]);
    expect(persisted.learning?.outcome).toBe("successful");

    await page.goto("/opportunities");
    const opportunityRow = page.getByRole("row").filter({ hasText: opportunityTitle });
    await expect(opportunityRow.getByText("Successful")).toBeVisible();
    await opportunityRow.getByRole("button", { name: `View ${opportunityTitle}` }).click();
    const opportunityDialog = page.getByRole("dialog", { name: opportunityTitle });
    await expect(opportunityDialog.getByText("Learning feedback")).toBeVisible();
    await expect(opportunityDialog.getByText(/Priority adjustment \+5/)).toBeVisible();

    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("2 / 2").first()).toBeVisible();
    const analyticsRow = page.getByRole("row").filter({ hasText: experimentName });
    await expect(analyticsRow).toContainText("Imported");
    await expect(analyticsRow).toContainText("200% attainment");
    await expect(analyticsRow.getByText("Successful")).toBeVisible();

    // The detail workspace remains usable on a phone-sized viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/experiments/${experimentId}`);
    await expect(page.getByRole("heading", { name: experimentName, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Execution plan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Measurements" })).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(opportunity.id).toBeTruthy();
  });
});
