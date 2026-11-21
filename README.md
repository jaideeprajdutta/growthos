# GrowthOS

An AI-powered growth operating system for digital-first businesses.

GrowthOS helps businesses understand their growth, identify bottlenecks, discover opportunities, run experiments and measure actual outcomes — a structured workflow of:

**Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn**

It supports SaaS, e-commerce, digital agency and online service businesses.

This repository is GrowthOS — the product: the Next.js application, the FastAPI backend with a data layer, and the GrowthOS workspaces. See [docs/PRODUCT_IMPLEMENTATION_STATUS.md](docs/PRODUCT_IMPLEMENTATION_STATUS.md) for what is implemented, AI-configured and what is deferred.

## Repository structure

```text
growthos/
├── frontend/           # Next.js App Router application (TypeScript, Tailwind CSS v4)
├── backend/            # FastAPI backend (Python, SQLAlchemy, Alembic)
├── docker-compose.yml  # local PostgreSQL development database
├── docs/               # architecture, database and API documentation
└── AGENTS.md           # agent-facing repository guidance
```

## Prerequisites

- Node.js >= 20.9 (the Next.js engines requirement; v22.14.0 used in development).
- Python 3.11+ (backend and Alembic migrations).
- PostgreSQL for the backend. No paid infrastructure is required.
- Chromium browser for Playwright E2E (installed by `npm run e2e:install`).

## Installation

```powershell
# Frontend dependencies (from the frontend/ directory)
npm install

# Backend dependencies (from the backend/ directory)
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt

# Playwright E2E tooling (from the frontend/ directory)
npm install -D @playwright/test@1.65.1
npx playwright install chromium
```

## Environment setup

### Backend

`backend/.env.example` documents the backend environment:

- `DATABASE_URL` — required. With the development PostgreSQL from `docker-compose.yml` (open the repo root with `docker compose up db`): `postgresql+psycopg://postgres:postgres@localhost:5432/growthos`. SQLite works for local development too, e.g. `sqlite:///growthos_dev.db`.
- `CORS_ORIGINS` — optional, defaults to `http://localhost:3000`.
- `LOG_LEVEL` — optional, defaults to `INFO`.
- `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` — optional. AI-dependent features (intelligence reports, diagnostics, opportunity generation) require a provider; see [AI configuration](docs/API.md#ai-configuration) for details and honest degradation behaviour.

### Frontend

`frontend/.env.example` documents `NEXT_PUBLIC_API_BASE_URL` — defaults to `http://localhost:8300` (the development backend); set it only when the backend runs on another port.

### Database

PostgreSQL is required. Start it with:

```powershell
docker compose up db
```

Apply migrations with Alembic:

```powershell
cd backend
.venv/Scripts/alembic upgrade head
```

The backend also runs `Base.metadata.create_all(engine)` on startup for development convenience; migrations remain the source of truth for production.

## Development

### Frontend (development, port 3000)

```powershell
cd frontend
npm run dev    # http://localhost:3000
```

Other commands: `npm run build`, `npm run start`, `npm run typecheck`, `npm run lint` (`npx eslint app components lib hooks types`).

### Backend (development, port 8300)

```powershell
cd backend
.venv/Scripts/uvicorn app.main:app --reload --host 127.0.0.1 --port 8300
```

The API is served under `/api/v1` — health check at `http://localhost:8300/api/v1/health`.

### Testing

Backend (pytest):

```powershell
cd backend
.venv/Scripts/python.exe -m pytest tests/ -q
```

Frontend:

```powershell
cd frontend
npm run typecheck    # tsc --noEmit
npm run build        # production build
npx eslint app components lib hooks types
```

## Playwright E2E suite

The browser suite is committed at `frontend/tests/e2e/`. It runs against an isolated `backend/e2e.db` and dedicated ports (backend `http://localhost:8301`, frontend `http://localhost:3101`), so real development/production data is never touched.

```powershell
cd frontend
npm run e2e        # npx playwright test
```

Tests cover: application rendering and sidebar navigation, company selection, onboarding form validation, business-intelligence research display, growth diagnosis, opportunity listing/status transitions, experiment handoff, evidence on opportunity details, duplicate submissions, cross-company isolation, mobile layout, persistence after reload, and backend-unavailable handling. Records are seeded through the real backend API (plus a `seed.py` helper for research rows) and use only isolated data.

## Current implementation status

GrowthOS — the product shell plus Phase 2: website research, business intelligence, growth diagnosis and opportunities. Details: [docs/PRODUCT_IMPLEMENTATION_STATUS.md](docs/PRODUCT_IMPLEMENTATION_STATUS.md).

## Known limitations

- AI features (intelligence reports, diagnostics, opportunity generation) are **not active**: no AI provider is configured (`AI_PROVIDER` unset). When generation is attempted, the backend returns a clear 503 (`AI provider is not configured...`). Real AI results are only produced with a provider + key configured; no fabricated AI output is ever presented.
- Local PostgreSQL was verified via SQLite (PostgreSQL via `docker-compose.yml` is the production target).
- Recharts chart components are not yet integrated; Analytics renders real data in stat cards, outcome tables and daily activity tables.
