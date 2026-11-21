# Architecture

GrowthOS is a two-service application: the Next.js frontend and the FastAPI backend, connected through a clean HTTP API boundary.

## High-level flow

```text
Browser → Next.js (frontend/) → FastAPI (backend/) → PostgreSQL (docker-compose.yml) or SQLite
```

- The frontend is a Next.js App Router application with React Server Components and client components.
- All data access happens through `frontend/lib/api.ts` — the single backend client (`growthosApi`). Business logic does not live in UI components.
- The backend exposes `/api/v1` with versioned routes; the API is the contract between frontend and backend.
- The backend persists data via SQLAlchemy ORM models and Alembic migrations.
- Ports: development backend `http://localhost:8300`, E2E backend `http://localhost:8301`; development frontend `http://localhost:3000`, E2E frontend `http://localhost:3101`.

## Frontend structure

```text
frontend/
├── app/                     # routes (pages, layouts)
│   ├── page.tsx             # Overview (real dashboard with real data)
│   ├── companies/           # Companies list, company profile, 5-step onboarding
│   ├── bi/                  # Business Intelligence (website research panel)
│   ├── diagnosis/           # Growth Diagnosis (7 growth phases + diagnostic findings)
│   ├── opportunities/       # Opportunities (list, detail, status transitions, generate)
│   ├── experiments/         # Experiments
│   ├── execution/           # Execution
│   ├── analytics/           # Analytics
│   ├── integrations/        # Integrations
│   └── settings/            # Settings
├── components/
│   ├── layout/              # AppShell (sidebar + top navigation), PageHeader, Breadcrumbs
│   ├── shared/              # StatusBadge, ResearchPanel, EvidenceViewer
│   └── ui/                  # shared primitives (Button, Card, Input, Select, Dialog, Toast, …)
├── hooks/                   # useApi, useActiveCompany
├── lib/                     # api.ts (backend client), validation.ts (Zod schemas), utils.ts
├── tests/e2e/               # Playwright E2E suite (committed)
└── types/index.ts           # shared TypeScript interfaces
```

The app shell (sidebar + top navigation) lives in `components/layout/app-shell.tsx`; it fetches the company list from the backend and drives active-route indicators, the collapsible sidebar (persisted), the mobile drawer and the company selector.

## Backend structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS, AI error handler, route registration
│   ├── api/v1/              # routes (health, companies, profiles, objectives, research, evidence,
│   │                        #   intelligence, diagnostics, opportunities, experiments, …)
│   ├── core/                # config (env settings), exceptions
│   ├── db/                  # session management
│   ├── models/              # SQLAlchemy models (Phase 1 + Phase 2)
│   ├── repositories/        # data access (tenant-scoped)
│   ├── services/            # business orchestration (companies)
│   ├── schemas/             # Pydantic request/response models
│   ├── research/            # site crawler (BFS, robots.txt, sitemap), extractor, jobs, URL safety
│   ├── intelligence/        # business-intelligence report generation
│   ├── diagnostics/         # diagnostic run generation (per business model)
│   ├── opportunities/       # opportunity generation engine + deterministic scoring
│   └── ai/                  # provider-independent AI clients (OpenAI, Anthropic)
├── alembic/                 # migrations
├── tests/                   # pytest suites
└── .env.example             # documented backend environment
```

## Data flow

1. The user navigates the sidebar (client component) — every item is a real route.
2. Pages fetch data via `growthosApi` → `fetch` → `GET/POST/PUT/DELETE http://localhost:8300/api/v1/...` (or `:8301` for E2E).
3. Backend handlers validate requests (Pydantic), execute via services/repositories against the tenant-scoped workspace.
4. Responses are serialized as camelCase JSON, matching `frontend/types`.
5. The frontend renders real data with explicit loading, empty and error states.

## Development and verification

- Backend: `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q` (115 tests).
- Frontend: `cd frontend && npm run typecheck` (tsc --noEmit), `npm run build` (production build, 15 routes), `npx eslint app components lib hooks types`.
- E2E: `cd frontend && npm run e2e` — committed Playwright suite in `frontend/tests/e2e/` against isolated `backend/e2e.db` + ports 8301/3101 (`npm run e2e:install` to install the tooling).

## Conventions

- **Honest data**: the UI never fabricates business metrics, fake integrations or invented AI results. Analytics shows real data; the Integrations page distinguishes available-for-implementation, configured, connected, disconnected and error.
- **AI behaviour**: AI features (intelligence, diagnostics, opportunity generation) return a clear 503 (`AIError` handler in `app/main.py`) when no provider is configured; the UI shows the same message. No AI output is ever presented as completed analysis without a configured provider.
- **Research**: SSRF-validated fetches (public hosts only), robots.txt policy fetched once per site, RFC 9309 semantics (missing robots.txt allows all), main-content extraction with per-page failure recording, duplicate page dedup, interrupted-run recovery on startup, and manual retry of failed pages.
- **Evidence provenance**: every evidence row records source URL, title, dimension, classification, observation date, and reliability flags; invalid evidence references are flagged and filtered on report generation.
- **Opportunity scoring**: deterministic from recorded fields (`app/opportunities/scoring.py`); AI-supplied priority scores are ignored.
- **Error handling**: API errors surface as toast notifications and honest empty states.
- **Accessibility**: interactive controls have labels, focus-visible states and semantic markup; forms are keyboard-operable.
- **Testing**: backend tests use FastAPI's TestClient against an isolated SQLite database; frontend has typecheck, lint, production-build and committed Playwright E2E verification.
