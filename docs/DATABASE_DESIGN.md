# Database design

GrowthOS uses PostgreSQL (via `docker-compose.yml`) with SQLAlchemy 2.0 ORM models and Alembic migrations. Local development verification used SQLite; the schema is identical across both dialects for the GrowthOS models.

## Tenant model

A GrowthOS deployment uses a single local workspace (`workspaces` — "GrowthOS", slug `growthos`) with a single local user (`users` — `Local User`, `auth_provider = "local"`). All companies belong to the workspace; all queries filter by `workspace_id` — tenant isolation.

## Tables

### Phase 1 (product shell)

| Table | Purpose |
| --- | --- |
| `workspaces` | Workspaces: id, name, slug (unique), timestamps |
| `users` | Local users: id, workspace_id, email (nullable), display_name, auth_provider, timestamps |
| `companies` | Company core data: name, website, isActive, businessModel, industry, businessStage, revenueModel, companyDescription, targetAudience, mainProductOrService, primaryMarket — id, workspace_id, timestamps; unique (workspace_id, name) |
| `company_profiles` | Business intelligence: positioningStatement, competitiveLandscape, marketContext, productDescription — id, company_id (unique FK), timestamps |
| `growth_objectives` | Primary and secondary growth objectives: objectiveType, customObjective, isPrimary |
| `opportunities` | Growth opportunities: title, description, supportingEvidence, expectedImpact, confidence (0–100), effort (1–10), risk, priorityScore (nullable), status, recommendedNextAction |
| `experiments` | Experiments: hypothesis, problem, action, targetAudience, successMetric, baseline, target, startDate, endDate, status, actualOutcome (nullable) |
| `experiment_results` | Recorded outcomes: outcome, metricsJson (nullable), recordedAt |
| `execution_actions` | Execution actions: title, description, status, executedAt (nullable), lastError (nullable) |
| `integrations` | Connections: provider, status, settingsJson (nullable), connectedAt (nullable) |
| `activity_log` | Activity history: company_id, actor_id (nullable FK), action, title, description, metadataJson |

### Phase 2 (website research, intelligence, diagnostics, opportunities)

| Table | Purpose |
| --- | --- |
| `company_intelligence_profiles` | Persistent, versioned company understanding (positioning, audience, market context, product description); every field records provenance (`provenance_json`) |
| `research_runs` | Website-research jobs: status (pending/running/completed/partially_completed/failed), pageCount, pagesScanned, errorMessage, startedAt/finishedAt |
| `research_pages` | Crawled pages per run: url, status (pending/scanned/failed), extracted text + word count, duration |
| `evidence` | Extracted, traceable statements: source URL/title, sourceType, dimension, extractedStatement, supportingExcerpt, observationDate, collectedAt, classification, reliabilityJson, verificationStatus |
| `intelligence_findings` | Positioning/audience findings per company: dimension, title, category, status, severity, confidence, evidenceIds |
| `intelligence_reports` | Structured intelligence reports: version, executiveSummary, sections, findingsCount, aiUsageJson (token usage, model, invalid evidence refs) |
| `diagnostic_runs` | Diagnostic engine runs: model, aiUsageJson, inputSummary |
| `diagnostic_findings` | Diagnostic findings per run: dimension (the 7 growth phases), problemStatement, description, category, severity (1–5), confidence (0–1), rootCauseHypothesis, validationMethod, suggestedNextStep, evidenceIds |
| `opportunity_evidence` | Links between opportunities and evidence rows (company-scoped) |

Foreign keys added by Phase 2: `experiments.opportunity_id → opportunities.id`, `opportunities.diagnostic_finding_id → diagnostic_findings.id`, plus indexed foreign keys `intelligence_reports.run_id → research_runs.id` and `experiments.opportunity_id`/`opportunities.diagnostic_finding_id`.

## Migrations

Alembic revision history:

| Revision | Purpose |
| --- | --- |
| `20261121_initial` | Phase 1 schema (workspaces, companies, profiles, objectives, opportunities, experiments, execution actions, integrations, activity log) |
| `20261130_phase2_models` | Phase 2 schema (intelligence, research, evidence, diagnostics, opportunity links) |
| `20261201_schema_alignment` | Forward, idempotent alignment of migration-built databases with the current ORM models |

The dev database is applied to Alembic head (`20261201_schema_alignment`) — see `docs/PRODUCT_IMPLEMENTATION_STATUS.md` → "Migrations and data preservation".

## Conventions

- IDs are UUID strings (`String(36)`).
- All timestamps are timezone-aware UTC (`DateTime(timezone=True)`); every table has `created_at` and `updated_at` (updated via `onupdate`).
- Statuses and enum-like values are stored as strings and validated by Pydantic schemas at the API boundary.
- Text fields use `Text` for free-form content; bounded strings use `String(n)`.
- Evidence rows record provenance (`evidence.reliability_json`, `evidence.source_title`); invalid evidence references are flagged by report generation (`intelligence_usage_json.invalid_evidence_references`).
- Opportunity priorities are deterministic heuristics over recorded fields (`app/opportunities/scoring.py`); AI-supplied scores are ignored.
- `activity_log` is append-only activity history (`action`, `title`, `description`, `metadata_json`).
- Schema is applied with Alembic (`alembic upgrade head`); `Base.metadata.create_all(engine)` also runs on backend startup for development convenience.
- Schema parity with the ORM is continuously verified (autogenerate diff = 0 differences).
