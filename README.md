# GrowthOS

An AI-powered growth operating system for digital-first businesses.

GrowthOS helps businesses understand their growth, identify bottlenecks, discover opportunities, run experiments and measure actual outcomes — a structured workflow of:

**Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn**

It supports SaaS, e-commerce, digital agency and online service businesses.

This repository is GrowthOS Phase 1 — the product shell: the Next.js application, the local FastAPI backend with a PostgreSQL data layer, and the GrowthOS workspaces. See [docs/PRODUCT_IMPLEMENTATION_STATUS.md](docs/PRODUCT_IMPLEMENTATION_STATUS.md) for what is implemented and what is deferred.

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

## Installation

```bash
# Frontend dependencies
cd frontend && npm install

# Backend dependencies
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
```

## Environment setup

### Backend

`backend/.env.example` documents the backend environment:

- `DATABASE_URL` — required. With the local development database: `postgresql+psycopg://postgres:postgres@localhost:5432/growthos`.
- `CORS_ORIGINS` — optional, defaults to `http://localhost:3000`.
- `LOG_LEVEL` — optional, defaults to `INFO`.

### Frontend

`frontend/.env.example` documents `NEXT_PUBLIC_API_BASE_URL` — defaults to `http://localhost:8000`; set it only when the backend runs on another port.

### Database

PostgreSQL is required. Start it with:

```bash
docker compose up db
```

Apply migrations with Alembic:

```bash
cd backend && .venv/Scripts/alembic upgrade head
```

The backend also runs `Base.metadata.create_all(engine)` on startup for development convenience; migrations remain the source of truth for production.

## Development

### Frontend

```bash
cd frontend && npm run dev    # http://localhost:3000
```

Other commands: `npm run build`, `npm run start`, `npm run typecheck`, `npm run lint` (run: `npx eslint app components lib hooks types`).

### Backend

```bash
cd backend && .venv/Scripts/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is served under `/api/v1` — health check at `http://localhost:8000/api/v1/health`.

### Testing

```bash
# Backend (pytest)
cd backend && .venv/Scripts/python.exe -m pytest tests/ -q

# Frontend
cd frontend && npm run typecheck    # tsc --noEmit
npm run build                       # production build
npx eslint app components lib hooks types
```

## Current implementation status

GrowthOS Phase 1: product shell — frontend + backend + local PostgreSQL. Details: [docs/PRODUCT_IMPLEMENTATION_STATUS.md](docs/PRODUCT_IMPLEMENTATION_STATUS.md).

## Known limitations

- The in-app browser tool could not navigate local pages in the development environment (tabs stayed `about:blank`), so browser-based UI verification was replaced with server-side verification: the backend API serves the created company, a simulated client fetch to the backend URL works, and the frontend dev server serves the pages.
- AI features (research, diagnosis, opportunity scoring) are planned for a later phase.
- Recharts chart components are not yet integrated; Analytics renders real data in stat cards, outcome tables and daily activity tables.
