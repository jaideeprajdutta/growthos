import { expect, test } from "@playwright/test";

const API = "http://localhost:8301/api/v1";

test("registers, signs out and signs back in through the UI", async ({ page, request }) => {
  const email = `e2e-auth-${Date.now()}@growthos.test`;
  const password = "PilotPassword123!";

  const unauthenticated = await request.get(`${API}/companies`);
  expect(unauthenticated.status()).toBe(401);

  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("growthos_token"));
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.getByLabel("Display name").fill("Pilot Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Pilot Tester", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
});
