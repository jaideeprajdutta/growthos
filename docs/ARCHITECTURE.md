# Architecture

GrowthOS is a two-service application: the Next.js frontend and the FastAPI backend, connected through a clean HTTP API boundary.

## High-level flow

```text
Browser → Next.js (frontend/) → FastAPI (backend/) → PostgreSQL (docker-compose.yml)
```

- The frontend is a Next.js App Router application with React Server Components and client components.
- All data access happens through `frontend/lib/api.ts` — the single backend client (`growthosApi`). Business logic does not live in UI components.
- The backend exposes `/api/v1` with versioned routes; the API is the contract between frontend and backend.
- The backend persists data via SQLAlchemy ORM models and Alembic migrations.

## Frontend structure

```text
frontend/
├── app/                     # routes (pages, layouts)
│   ├── page.tsx             # Overview (real dashboard with real data)
│   ├── companies/           # Companies list, company profile, 5-step onboarding
│   ├── bi/                  # Business Intelligence
│   ├── diagnosis/           # Growth Diagnosis
│   ├── opportunities/       # Opportunities
│   ├── experiments/         # Experiments
│   ├── execution/           # Execution
│   ├── analytics/           # Analytics
│   ├── integrations/        # Integrations
│   └── settings/            # Settings
├── components/
│   ├── layout/              # AppShell (sidebar + top navigation), PageHeader, Breadcrumbs
│   ├── shared/              # StatusBadge
│   └── ui/                  # shared primitives (Button, Card, Input, Select, Dialog, Toast, …)
├── hooks/                   # useApi, useActiveCompany
├── lib/                     # api.ts (backend client), validation.ts (Zod schemas), utils.ts
└── types/index.ts           # shared TypeScript interfaces
```

The app shell (sidebar + top navigation) lives in `components/layout/app-shell.tsx`; it fetches the company list from the backend and drives active-route indicators, the collapsible sidebar (persisted) and the mobile drawer.

## Backend structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS, error handlers, route registration
│   ├── api/v1/              # routes (health, companies, company profiles, objectives, …)
│   ├── core/                # config, exceptions
│   ├── db/                  # session management
│   ├── models/              # SQLAlchemy models
│   ├── repositories/        # data access (tenant-scoped)
│   ├── services/            # business orchestration (companies)
│   └── schemas/             # Pydantic request/response models
├── alembic/                 # migrations
└── tests/                   # pytest suites
```

## Data flow

1. The user navigates the sidebar (client component) — every item is a real route.
2. Pages fetch data via `growthosApi` → `fetch` → `GET/POST/PUT/DELETE http://localhost:8000/api/v1/...`.
3. Backend handlers validate requests (Pydantic), execute via services/repositories against the tenant-scoped workspace.
4. Responses are serialized as camelCase JSON, matching `frontend/types`.
5. The frontend renders real data with explicit loading, empty and error states.

## Conventions

- **Honest data**: the UI never fabricates business metrics, fake integrations or invented AI results. Analytics shows real data; the Integrations page distinguishes available-for-implementation, configured, connected, disconnected and error.
- **Error handling**: API errors surface as toast notifications and honest empty states.
- **Accessibility**: interactive controls have labels, focus-visible states and semantic markup; forms are keyboard-operable.
- **Testing**: backend tests use FastAPI's TestClient against an isolated SQLite database; frontend has `typecheck`, `lint` and production-build verification.
