<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GrowthOS, Phase 2 — product shell + growth system

## State of this repo

- GrowthOS Phase 2: the Next.js App Router app lives in `frontend/`; the FastAPI backend lives in `backend/`; the growth-system docs live in `docs/` (see `docs/PRODUCT_IMPLEMENTATION_STATUS.md` for the feature status).

## Commands

From `backend/`:

- `.venv/Scripts/python.exe -m pytest tests/ -q` — backend tests (115 passing).
- `.venv/Scripts/alembic upgrade head` — apply migrations.
- `.venv/Scripts/uvicorn app.main:app --reload --host 127.0.0.1 --port 8300` — start the API (dev backend on `http://localhost:8300`).
- `python -m venv .venv && .venv/Scripts/pip install -r requirements.txt` — first-time setup.

From `frontend/`:

- `npm run dev` — dev server, open http://localhost:3000.
- `npm run build` / `npm run start`.
- `npx eslint app components lib hooks types` — lint (0 errors expected).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run e2e` — Playwright suite against an isolated `backend/e2e.db` + ports 8301/3101 (runs the committed suite in `frontend/tests/e2e/`).
- `npm run e2e:install` — install `@playwright/test@1.65.1` + the chromium browser.

- Node `>= 20.9` (Next engines). Installed: v22.14.0.

## Tech facts

- TypeScript: strict, bundler moduleResolution, `@/*` alias → repo root (tsconfig).
- Tailwind v4 — `globals.css` starts `@import "tailwindcss";` and uses `@theme inline` tokens (`--color-background`, `--color-foreground`, `--font-geist-sans`, `--font-geist-mono`).
- ESLint: `eslint-config-next` (core-web-vitals + typescript).
- Backend: FastAPI + SQLAlchemy + Alembic (`backend/`); PostgreSQL via `docker-compose.yml` (dev verification used SQLite; see `docs/DATABASE_DESIGN.md`).
- `next.config.ts`: `cacheComponents` and `partialPrefetching` enabled; turbopack CSS rule via `@tailwindcss/turbopack`.
- Phase 2 models (`app/models/`): `CompanyIntelligenceProfile`, `ResearchRun`/`ResearchPage`, `Evidence`, `IntelligenceFinding`/`IntelligenceReport`, `DiagnosticRun`/`DiagnosticFinding`, `OpportunityEvidence`.
- AI: `AI_PROVIDER` (`openai`/`anthropic`), `AI_API_KEY` (or `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`), `AI_MODEL` — see `backend/.env.example`; AI features are **not active** in this environment (no credentials); attempts return 503 with a clear message.
- Alembic history: `20261121_initial` → `20261130_phase2_models` → `20261201_schema_alignment` (idempotent forward alignment).

## Product context

GrowthOS is an AI-powered growth operating system for digital-first businesses — SaaS, e-commerce, agencies, online services. Workflow: Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn. This repo builds the product shell plus Phase 2 (research, business intelligence, growth diagnosis, opportunities); the AI-provider abstraction is built but inactive without credentials.

## Development standards

- Production-quality UI and UX: premium, professional B2B SaaS feel — clean typography, strong visual hierarchy, subtle borders/shadows, responsive across devices, accessible; no generic dashboard aesthetics.
- Fully working features, not mockups: real behavior or clearly labelled demonstration data; no fabricated metrics or invented AI results.
- Comprehensive testing and verification: run lint, typecheck and tests, start the app and verify features work; don't mark anything complete unverified.
- Detailed implementation and documentation.
- Frequent, meaningful commits; write natural, human-sounding commit messages; push to the remote after milestones whenever a remote is configured.
