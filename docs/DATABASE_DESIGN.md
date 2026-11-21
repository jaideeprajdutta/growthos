# Database design

GrowthOS uses PostgreSQL (via `docker-compose.yml`) with SQLAlchemy 2.0 ORM models and Alembic migrations.

## Tenant model

A GrowthOS deployment uses a single local workspace (`workspaces` — "GrowthOS", slug `growthos`) with a single local user (`users` — `Local User`, `auth_provider = "local"`). All companies belong to the workspace; all queries filter by `workspace_id` — tenant isolation.

## Tables

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

## Conventions

- IDs are UUID strings (`String(36)`).
- All timestamps are timezone-aware UTC (`DateTime(timezone=True)`); every table has `created_at` and `updated_at` (updated via `onupdate`).
- Statuses and enum-like values are stored as strings and validated by Pydantic schemas at the API boundary.
- Text fields use `Text` for free-form content; bounded strings use `String(n)`.
- Schema is applied with Alembic — initial revision `20261121_initial` (verified at build time against SQLite since PostgreSQL is not installed locally).
- The backend also runs `Base.metadata.create_all(engine)` on startup for development convenience.
