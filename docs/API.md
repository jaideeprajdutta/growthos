# API reference

Versioned under `/api/v1`. The API serves the single local workspace — there is no authentication yet. Requests and responses are camelCase JSON. Errors use `{"detail": "..."}`; 404 for missing records, 409 for uniqueness violations, 422 for validation errors.

## Health

- `GET /api/v1/health` → `{"status": "ok"}`

## Companies

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/companies` | Create a company (201). Duplicate names in the workspace → 409. |
| `GET` | `/companies` | List companies (200). |
| `GET` | `/companies/{id}` | Retrieve a company (200 or 404). |
| `PUT` | `/companies/{id}` | Update company fields (200 or 404). |
| `DELETE` | `/companies/{id}` | Delete the company and its dependents (204 or 404). |
| `GET` | `/companies/{id}/stats` | Real counts: opportunities, running experiments, objectives (200 or 404). |

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

## Opportunities

- `POST /companies/{id}/opportunities` (201)
- `GET /companies/{id}/opportunities` (200)
- `PUT /companies/{id}/opportunities/{opportunity_id}` (200)
- `DELETE /companies/{id}/opportunities/{opportunity_id}` (204)

Fields: `title`, `description`, `supportingEvidence`, `expectedImpact`, `confidence` (0–100), `effort` (1–10), `risk`, `priorityScore` (optional), `status`, `recommendedNextAction`.

## Experiments

- `POST /companies/{id}/experiments` (201)
- `GET /companies/{id}/experiments` (200)
- `PUT /companies/{id}/experiments/{experiment_id}` (200)
- `DELETE /companies/{id}/experiments/{experiment_id}` (204)

Fields: `hypothesis`, `problem`, `action`, `targetAudience`, `successMetric`, `baseline`, `target`, `startDate`, `endDate`, `status`, `actualOutcome`.

## Experiment results

- `POST /companies/{id}/experiments/{experiment_id}/results` (201)
- `GET /companies/{id}/experiments/{experiment_id}/results` (200)
- `PUT /companies/{id}/experiments/{experiment_id}/results/{result_id}` (200)
- `DELETE /companies/{id}/experiments/{experiment_id}/results/{result_id}` (204)

Fields: `outcome`, `metrics` (optional JSON object), `recordedAt`.

## Execution actions

- `POST /companies/{id}/execution-actions` (201)
- `GET /companies/{id}/execution-actions` (200)
- `PUT /companies/{id}/execution-actions/{action_id}` (200)
- `DELETE /companies/{id}/execution-actions/{action_id}` (204)

Fields: `title`, `description`, `status` (`pending`, `approved`, `scheduled`, `in_progress`, `executed`, `failed`, `paused`, `cancelled`), `executedAt` (optional), `lastError` (optional).

## Integrations

- `POST /companies/{id}/integrations` (201)
- `GET /companies/{id}/integrations` (200)
- `PUT /companies/{id}/integrations/{integration_id}` (200)
- `DELETE /companies/{id}/integrations/{integration_id}` (204)

Fields: `provider` (`google_analytics`, `google_search_console`, `hubspot`, `shopify`, `stripe`, `meta_ads`, `google_ads`, `crm`, `other`), `status` (`configured`, `disconnected`, `error`), `settings` (optional JSON), `connectedAt` (optional).

## Activity log

- `GET /companies/{id}/activity?limit=50&offset=0` (200) — newest first.
