# API reference

Versioned under `/api/v1`. The API serves the single local workspace — there is no authentication yet. Requests and responses are camelCase JSON. Errors use `{"detail": "..."}`; 404 for missing records, 409 for uniqueness/business conflicts, 422 for validation errors, 503 for AI provider failures.

## Health

- `GET /api/v1/health` → `{"status": "ok"}`

## Companies

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/companies` | Create a company (201). Duplicate names in the workspace → 409. Invalid website → 422. |
| `GET` | `/companies` | List companies (200). |
| `GET` | `/companies/{id}` | Retrieve a company (200 or 404). |
| `PUT` | `/companies/{id}` | Update company fields (200 or 404). |
| `DELETE` | `/companies/{id}` | Delete the company and all Phase 2 dependents (204 or 404). |
| `GET` | `/companies/{id}/stats` | Real counts: opportunities, running experiments, objectives (200 or 404). |

Company fields: `name`, `website` (optional http(s) URL — empty string allowed, credentials and malformed schemes rejected with 422), `isActive`, `businessModel`, `industry`, `businessStage`, `revenueModel`, `companyDescription`, `targetAudience`, `mainProductOrService`, `primaryMarket`.

## Company profiles (business intelligence)

- `GET /companies/{id}/profile` → profile or `null`
- `POST /companies/{id}/profile` (201) — create or update
- `PUT /companies/{id}/profile` — update

Profile fields: `positioningStatement`, `competitiveLandscape`, `marketContext`, `productDescription`.

## Growth objectives

- `POST /companies/{id}/growth-objectives` (201)
- `GET /companies/{id}/growth-objectives` (200)
- `PUT /companies/{id}/growth-objectives/{objective_id}` (200)
- `DELETE /companies/{id}/growth-objectives/{objective_id}` (204)

Fields: `objectiveType` (`revenue`, `customer_acquisition`, `conversion`, `retention`, `lead_generation`, `other`), `customObjective`, `isPrimary`.

## Research (website-research jobs)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/companies/{id}/research` (201) | Start a research job. Rejects unsafe/invalid URLs (400) and duplicate active runs (409). |
| `GET` | `/companies/{id}/research/runs` (200) | List runs, newest first. |
| `GET` | `/companies/{id}/research/runs/{run_id}` (200 or 404) | Run detail. |
| `GET` | `/companies/{id}/research/runs/{run_id}/pages` (200) | Pages of a run. |
| `GET` | `/companies/{id}/research/pages/{page_id}` (200 or 404) | Page detail (status, title, extracted text, word count). |
| `POST` | `/companies/{id}/research/pages/{page_id}/retry` (202) | Reset a failed page and re-fetch it in the background. |

Run status: `pending` → `running` → `completed` / `partially_completed` (some pages failed) / `failed`. Interrupted runs (e.g. after a backend restart) are marked failed on startup. Research is SSRF-safe (public hosts only), fetches `robots.txt` once per site (RFC 9309 semantics), prefers main/article content, skips auth/cart paths and thin pages.

## Evidence

- `GET /companies/{id}/evidence` (200) — traceable evidence for the company, newest first.
- `GET /companies/{id}/evidence/{evidence_id}` (200 or 404)

Evidence fields: `id`, `sourceUrl`, `sourceTitle`, `sourceType`, `dimension`, `extractedStatement`, `supportingExcerpt`, `observationDate`, `collectedAt`, `classification`, `verificationStatus`, `reliabilityJson`.

## Intelligence

- `GET /companies/{id}/intelligence` (200 or null) — structured company understanding (profile fields; every field carries provenance).
- `POST /companies/{id}/intelligence/generate?force_refresh=false` (200) — generate or reuse the company's intelligence report.
- `GET /companies/{id}/reports` (200) — list intelligence reports, newest first.

`IntelligenceReport`: `id`, `companyId`, `runId`, `version` (auto-increments on refresh), `executiveSummary`, `sections`, `findingsCount`, `aiUsageJson` (input/output tokens, model, invalid evidence references). Evidence references that don't exist for the company are flagged and filtered.

## Diagnostics

- `POST /companies/{id}/diagnostics/generate` (200) — run the diagnostic engine.
- `GET /companies/{id}/diagnostic-runs` (200) — list diagnostic runs.
- `GET /companies/{id}/diagnostic-runs/{run_id}/findings` (200) — findings of a run.
- `GET /companies/{id}/diagnostic-findings` (200) — company findings, newest first.

Diagnostic frameworks are chosen deterministically per business model (`saas`, `ecommerce`, `agency`, `services`, `other`); findings are evidence-backed with severity (1–5), confidence (0–1) and suggested next steps.

## Opportunities

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/companies/{id}/opportunities` (201) | Create an opportunity. Duplicates of titles are allowed; normalized duplicates are rejected by the generation engine. |
| `GET` | `/companies/{id}/opportunities` (200) | List opportunities. |
| `PUT` | `/companies/{id}/opportunities/{opportunity_id}` (200 or 404) | Update fields. |
| `DELETE` | `/companies/{id}/opportunities/{opportunity_id}` (204 or 404) | Delete. |
| `GET` | `/companies/{id}/opportunities/{opportunity_id}` (200) | Detail with evidence links and experiments. |
| `POST` | `/companies/{id}/opportunities/generate` (201) | Generate evidence-backed opportunities from intelligence/diagnostics. Requires AI (see below); invalid evidence references are filtered. |
| `POST` | `/companies/{id}/opportunities/{opportunity_id}/experiments` (201) | Create an experiment linked to the opportunity (handoff). |
| `POST` | `/companies/{id}/opportunities/{opportunity_id}/evidence` (200) | Link evidence to the opportunity. |

Opportunity fields: `title`, `description`, `supportingEvidence`, `expectedImpact`, `confidence` (0–100), `effort` (1–10), `risk`, `priorityScore`, `status` (`proposed`, `prioritized`, `selected`, `in_progress`, `completed`, `rejected`, `discovered`, `reviewing`, `approved`, `experimenting`, `implemented`, `archived`, `deferred`), `recommendedNextAction`.

`priorityScore` is deterministic (`round(confidence × 0.4) + round((10 − effort) × 0.3) + status bonus`); AI-supplied scores are ignored. Setting a status transition that has no score computes one.

## Experiments, experiment results, execution actions, integrations

- `POST/GET/PUT/DELETE /companies/{id}/experiments`, `.../experiments/{experiment_id}/results`, `.../experiments/{experiment_id}/results/{result_id}`
- `POST/GET/PUT/DELETE /companies/{id}/experiments` + results as above; experiment fields: `hypothesis`, `problem`, `action`, `targetAudience`, `successMetric`, `baseline`, `target`, `startDate`, `endDate`, `status`, `actualOutcome` (nullable).
- Execution actions: `POST/GET/PUT/DELETE /companies/{id}/execution-actions`, fields `title`, `description`, `status` (`pending`, `approved`, `scheduled`, `in_progress`, `executed`, `failed`, `paused`, `cancelled`), `executedAt` (nullable), `lastError` (nullable).
- Integrations: `POST/GET/PUT/DELETE /companies/{id}/integrations`, fields `provider`, `status`, `settings` (JSON), `connectedAt` (nullable).

## Activity log

- `GET /companies/{id}/activity?limit=50&offset=0` (200) — newest first.

## AI configuration and failure behaviour

AI-dependent features (`POST /companies/{id}/intelligence/generate`, `POST /companies/{id}/diagnostics/generate`, `POST /companies/{id}/opportunities/generate`) require `AI_PROVIDER` + a key in the backend environment (`AI_PROVIDER` = `openai` | `anthropic`; `AI_API_KEY`, or `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`; `AI_MODEL` optional). When no provider is configured they fail with **503** and `{"detail": "No AI provider is configured..."}` — the UI surfaces this message. This environment has no credentials, so AI endpoints return 503; research, evidence and all other endpoints are fully operational.

## Playwright E2E suite

The committed suite lives in `frontend/tests/e2e/` and runs against an isolated `backend/e2e.db` and dedicated ports (backend `http://localhost:8301`, frontend `http://localhost:3101`). Records seeded through the API are isolated per test; see `docs/ARCHITECTURE.md` for the run command.
