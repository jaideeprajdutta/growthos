/** Shared helpers for GrowthOS Playwright E2E tests: seeding via the live API and via the E2E database helper. */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import type { Evidence, GrowthObjective, Opportunity, OpportunityStatus } from "@/types";
import { authHeaders } from "./auth-state";

const BACKEND = "http://localhost:8301/api/v1";
const BACKEND_DIR = path.resolve(__dirname, "../../../backend");
const SEED_SCRIPT = path.join(__dirname, "seed.py");

function getPython(): string {
  const venv = path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe");
  return fs.existsSync(venv) ? venv : "python";
}

function runSeedScript(args: string[]): string {
  const result = spawnSync(getPython(), [SEED_SCRIPT, ...args], { encoding: "utf8", timeout: 60_000 });
  expect(result.status, `seed.py ${args.join(" ")} failed: ${result.stderr ?? ""}`).toBe(0);
  return (result.stdout ?? "").trim();
}

async function postJson<T>(request: APIRequestContext, pathName: string, body?: unknown): Promise<T> {
  const response = await request.post(`${BACKEND}${pathName}`, { headers: authHeaders(), ...(body ? { data: body } : {}) });
  expect(response.ok(), `POST ${pathName} failed with ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function putJson<T>(request: APIRequestContext, pathName: string, body?: unknown): Promise<T> {
  const response = await request.put(`${BACKEND}${pathName}`, { headers: authHeaders(), ...(body ? { data: body } : {}) });
  expect(response.status()).toBeLessThan(400);
  return response.json() as Promise<T>;
}

export async function seedCompany(
  request: APIRequestContext,
  name: string,
  opts: { website?: string; businessModel?: string; isActive?: boolean } = {}
): Promise<{ id: string; name: string }> {
  return postJson(request, "/companies", {
    name,
    website: opts.website ?? "",
    businessModel: opts.businessModel ?? "other",
    isActive: opts.isActive ?? true,
  });
}

export async function activateCompany(request: APIRequestContext, companyId: string): Promise<void> {
  const list = (await (await request.get(`${BACKEND}/companies`, { headers: authHeaders() })).json()) as { id: string; isActive: boolean }[];
  for (const company of list) {
    const isActive = company.id === companyId;
    if (company.isActive !== isActive) {
      const response = await request.put(`${BACKEND}/companies/${company.id}`, {
        headers: authHeaders(),
        data: { isActive },
      });
      expect(response.ok()).toBeTruthy();
    }
  }
}

export async function seedObjective(
  request: APIRequestContext,
  companyId: string,
  objectiveType: string,
  opts: { isPrimary?: boolean } = {}
): Promise<GrowthObjective> {
  return postJson(request, `/companies/${companyId}/growth-objective`, {
    objectiveType,
    isPrimary: opts.isPrimary ?? true,
  });
}

export async function seedOpportunity(
  request: APIRequestContext,
  companyId: string,
  data: { title: string; confidence?: number; effort?: number; status?: OpportunityStatus }
): Promise<Opportunity> {
  return postJson(request, `/companies/${companyId}/opportunities`, {
    title: data.title,
    confidence: data.confidence ?? 80,
    effort: data.effort ?? 3,
    status: data.status ?? "discovered",
  });
}

export async function getOpportunities(request: APIRequestContext, companyId: string): Promise<Opportunity[]> {
  const response = await request.get(`${BACKEND}/companies/${companyId}/opportunities`, { headers: authHeaders() });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Opportunity[]>;
}

export async function getEvidenceList(request: APIRequestContext, companyId: string): Promise<Evidence[]> {
  const response = await request.get(`${BACKEND}/companies/${companyId}/evidence`, { headers: authHeaders() });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Evidence[]>;
}

export async function linkEvidence(
  request: APIRequestContext,
  companyId: string,
  opportunityId: string,
  evidenceIds: string[]
): Promise<void> {
  const response = await request.post(`${BACKEND}/companies/${companyId}/opportunities/${opportunityId}/evidence`, {
    headers: authHeaders(),
    data: { evidenceIds },
  });
  expect(response.ok()).toBeTruthy();
}

/** Seed a diagnostic finding via the E2E database helper; returns nothing. */
export function seedFinding(
  request: APIRequestContext,
  companyId: string,
  finding: { dimension: string; problem: string; severity?: number; category?: string }
): void {
  runSeedScript([
    "finding",
    "--company-id",
    companyId,
    "--dimension",
    finding.dimension,
    "--problem",
    finding.problem,
    "--severity",
    String(finding.severity ?? 4),
    "--category",
    finding.category ?? "confirmed_issue",
  ]);
}

/** Seed research run + pages via the E2E database helper; returns the run id. */
export function runSeed(args: string[]): string {
  return runSeedScript(args);
}

/** Seed a research evidence row; returns the new evidence id. */
export function seedEvidence(
  request: APIRequestContext,
  companyId: string,
  evidence: { url: string; statement: string; title?: string }
): string {
  const output = runSeedScript([
    "evidence",
    "--company-id",
    companyId,
    "--url",
    evidence.url,
    "--statement",
    evidence.statement,
    ...(evidence.title ? ["--title", evidence.title] : []),
  ]);
  expect(output.length).toBeGreaterThan(0);
  return output;
}
