# GrowthOS free-tier deployment guide

This guide publishes GrowthOS publicly for **₹0/month** using only free tiers:

| Layer | Service | Free-tier facts relevant to this app |
| --- | --- | --- |
| Frontend | [Vercel Hobby](https://vercel.com/docs/plans/hobby) | $0/month; 100 GB Fast Data Transfer, 1M CDN requests/month, 300s function duration, 100 deployments/day. Hobby projects use `*.vercel.app` URLs; no custom domain is needed. |
| Database | [Supabase Free](https://supabase.com/docs/guides/platform/free-plan) | $0/month; two free projects across owned organisations, 500 MB database size per project, 5 GB egress, 50k MAU. Free projects can be paused after inactivity. |
| Backend | [Render Free web service](https://render.com/docs/free) | $0/month; 0.1 CPU / 512 MB, 750 free instance-hours/month per workspace. Spins down after 15 minutes idle and takes about one minute to wake. Filesystem is ephemeral. |

No paid plan, card verification, custom domain, AI credit, or marketplace add-on is required. If usage stays inside the published free allowances, the monthly cost is ₹0. Render suspends free services rather than charging when included bandwidth is exhausted without a payment method, so the app can go offline but no charge is created.

## Architecture

```
Browser
  │  HTTPS
  ▼
Next.js frontend (Vercel Hobby)
  │  requests to NEXT_PUBLIC_API_BASE_URL
  ▼
FastAPI backend (Render Free)
  │  SQLAlchemy over psycopg
  ▼
Supabase Free PostgreSQL (session pooler)
```

The browser only receives the public backend URL and a signed-in user's bearer token. Database credentials and optional AI keys stay in the backend environment. The frontend never reads `DATABASE_URL`.

## What is production-ready in this build

- **Authentication:** email/password registration, login, logout, `/auth/me`; PBKDF2-HMAC-SHA256 password hashes; random bearer tokens stored only as SHA-256 digests; seven-day sessions by default.
- **Tenant isolation:** registration creates a private workspace. Every product query is filtered through the authenticated user's `workspace_id`. A user cannot read or mutate another account's company records.
- **Production hardening:** HTTPS-only explicit CORS origins, API docs disabled by default, security headers, HSTS in production, no `create_all()` on production startup, Alembic is the schema source of truth, readiness probe, generic 500 responses with server-side exception logging.
- **Research recovery:** interrupted research runs are marked failed at startup so the UI can offer a retry instead of polling forever.
- **Input and outbound safety:** Pydantic validation, website URL validation, and SSRF protection on research fetches remain in place.
- **AI is optional:** with no `AI_PROVIDER`/API key, AI endpoints return a clear 503. All manual research, diagnosis, opportunity, experiment, execution, measurement, and analytics features continue to work.

## 1. Create the free PostgreSQL database (Supabase)

1. Sign in to [Supabase](https://supabase.com) and create an organisation on the Free plan if needed.
2. Create a **new project** on the Free plan. Do not add billing details.
3. Choose a region close to the Render backend region (`oregon` is the Render default in `render.yaml`).
4. Set a strong database password and store it temporarily in a password manager. It is written only to the Render `DATABASE_URL` secret.
5. In **Project Settings → Database → Connection string**, select the **Session pooler** connection string (port `6543`) and copy it. Convert the scheme to `postgresql+psycopg://` if Supabase returns `postgresql://`.

Example (never commit the real value):

```
postgresql+psycopg://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

The engine uses a small pool (`pool_size=5`, `max_overflow=5`) so the free-plan connection ceiling is respected.

> Supabase free projects may be paused after inactivity. Restore the project from the dashboard before testing; the data remains in PostgreSQL.

## 2. Deploy the FastAPI backend (Render)

### Option A — Blueprint

`render.yaml` at the repository root defines the free web service. In Render, choose **New → Blueprint**, connect the GitHub repository `jaideeprajdutta/growthos`, select the `master` branch, and apply. Render prompts for the two secret environment variables because they use `sync: false`:

- `DATABASE_URL` — the pooled Supabase URL from step 1.
- `CORS_ORIGINS` — temporarily `http://localhost:3000` is fine for the first deploy; update it to the Vercel URL after step 3.

The blueprint runs `alembic upgrade head` on every deploy before starting Uvicorn.

### Option B — dashboard

Create **New → Web Service** with these settings:

| Setting | Value |
| --- | --- |
| Repository | `jaideeprajdutta/growthos` |
| Branch | `master` |
| Root directory | `backend` |
| Runtime | Python |
| Plan | Free |
| Build command | `pip install -r requirements.txt` |
| Start command | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/api/v1/health` |
| Auto deploy | Yes (commit) |

Set the environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Supabase Postgres URL with `sslmode=require`. |
| `CORS_ORIGINS` | Yes in production | Exact frontend origin(s), comma-separated, `https://` only. No `*`. |
| `ENVIRONMENT` | Yes | `production`. Enables HTTPS CORS checks, hides `/docs`, skips `create_all()`. |
| `LOG_LEVEL` | No | `INFO` (default). |
| `SESSION_TTL_HOURS` | No | `168` (default, 7 days; allowed 1–720). |
| `ALLOW_REGISTRATION` | No | `true` (default). Set `false` to close signups. |
| `ENABLE_API_DOCS` | No | `false` (default in production). Set `true` only if API docs must be public. |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` | No | Leave unset. AI features return 503 without credentials. |

Wait for the deploy to finish, then verify:

```bash
curl https://<backend>.onrender.com/api/v1/health
curl https://<backend>.onrender.com/api/v1/health/ready
```

The first returns `{"status":"ok"}`. The second returns `{"status":"ready"}` only if the database connection and migrated schema are usable. API docs (`/docs`, `/openapi.json`) should return 404.

## 3. Deploy the Next.js frontend (Vercel Hobby)

The Vercel CLI is already authenticated as `jaideeprajdutta`. From the repository root:

```bash
cd frontend
vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
# paste: https://<backend>.onrender.com
vercel --prod
```

Alternatively, import the repository in the Vercel dashboard with framework preset **Next.js**, root directory `frontend`, and add the same environment variable. Vercel detects `next build`; no custom build command is required.

The production build includes `/login` and `/register`. The frontend calls `${NEXT_PUBLIC_API_BASE_URL}/api/v1/...`, so the value must be the Render origin only — no trailing `/api/v1`.

After Vercel gives the production URL (for example `https://growthos-<hash>.vercel.app`), set the backend `CORS_ORIGINS` to that exact URL and redeploy Render. CORS must match the browser origin exactly, including `https://`.

## 4. First-run verification in the live app

Use a real browser, not only `curl`:

1. Open the Vercel URL. An unauthenticated visit to `/` redirects to `/login`.
2. Choose **Create an account**, register with a unique email and a password of at least eight characters. Overview and the signed-in display name should appear.
3. Open `/companies/onboarding` and create a company. Check that the shell selector lists it.
4. Open `/bi`, run website research if the public website is fetchable, and confirm pages/evidence persist after reload.
5. Open `/diagnosis`, `/opportunities`, `/experiments`, `/execution`, and `/analytics`. Record at least one opportunity and one experiment; reload and confirm persistence.
6. Register a second account in a separate browser profile and confirm the first account's company is not visible.
7. Sign out, sign back in, and confirm the same workspace returns.
8. Resize to a phone viewport and verify the menu, selectors, tables, and dialogs remain usable.
9. Stop the backend (or block its domain) and confirm the frontend shows a clear error instead of fabricated data.
10. Check browser DevTools: no secret is exposed, no request goes to localhost, and no 401/CORS errors occur during a signed-in session.

## 5. Data safety and migrations

- The development database `backend/growthos_dev.db` and its backup are untouched by deployment. Never point `DATABASE_URL` at them.
- E2E tests use only `backend/e2e.db` on ports 8301/3101. Never point E2E at production.
- Alembic history: `20261121_initial_schema` → `20261130_phase2_models` → `20261201_schema_alignment` → `20261122_phase3_growth_loop` → `20261123_authentication`.
- Migrations are forward-only and idempotent where an existing column/index may already exist. Production startup does **not** call `Base.metadata.create_all()`.
- Existing pre-auth local users have no password hash and cannot sign in. New registrations receive separate private workspaces.
- To roll back an application bug, redeploy the previous Git commit. Do not downgrade the database migration as part of a routine rollback.

## 6. Quotas, sleep, and known limitations

- **Render free backend sleeps** after 15 minutes without inbound traffic. The first request after idle takes about one minute; Vercel requests may time out during that wake-up. Retry once. All data lives in Supabase, so sleep loses no records.
- **Render free filesystem is ephemeral.** Local SQLite, uploads, or any file written by the process disappear on redeploy/restart. PostgreSQL is mandatory in production.
- **Render free services have 750 instance-hours/month** per workspace and limited included bandwidth. Without a payment method, exceeding bandwidth suspends free services instead of charging. Stay within free limits to keep the app online.
- **Supabase free projects can be paused after inactivity** and are limited to 500 MB per project. Restore from the dashboard if paused.
- **Vercel Hobby is for non-commercial use** and has 100 GB transfer, 1M CDN requests, and 100 deployments/day. It does not include custom domains on the free tier.
- **Research jobs run inside the backend process.** They are not a durable queue. A redeploy or sudden process exit interrupts them; startup recovery marks interrupted runs failed so the UI can retry. Long jobs should later move to a dedicated worker.
- **Authentication rate limiting is process-local.** It deters casual brute force but is not shared across multiple backend instances. Keep one free instance.
- **No email verification, password reset, OAuth, or MFA** is included. This is a private pilot, not an enterprise identity system.
- **No AI credits are used.** AI-powered generation remains unavailable and returns 503. Deterministic research, diagnosis, scoring, and manual workflows work without AI.
- **Execution is manual.** No external action integration, outbound posting, or autonomous spend was added.

## 7. Secret handling

- Never commit `.env` files, connection strings, tokens, or API keys.
- `.env.example` files document names only and contain no real values.
- Supabase password and Render `DATABASE_URL`/`CORS_ORIGINS` are entered through provider dashboards.
- Session tokens are random and only their SHA-256 hashes are stored. Revocation on logout is immediate.
- Optional AI credentials, if ever added, belong only in the backend environment.

## 8. Verification evidence to collect for the final report

- Live frontend URL and backend health URLs.
- Result of unauthenticated `/api/v1/companies` → `401`.
- Result of `/api/v1/health/ready` → `{"status":"ready"}`.
- Confirmation that `/docs` and `/openapi.json` are disabled.
- Browser check of registration, login/logout, tenant isolation, company creation, research/evidence, opportunities, experiments, execution, analytics, error states, and mobile layout.
- `git rev-parse HEAD` and `git status --porcelain` after all commits are pushed.
- Monthly cost calculation: Vercel $0 + Supabase $0 + Render $0 = ₹0, with no payment method added.

## Official references

- <https://vercel.com/docs/plans/hobby>
- <https://supabase.com/docs/guides/platform/free-plan>
- <https://render.com/docs/free>
- <https://render.com/docs/blueprint-spec>
