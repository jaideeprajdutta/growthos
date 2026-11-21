<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GrowthOS, Phase 0 — product shell

## State of this repo

- A bare Next.js scaffold: `app/` contains only `layout.tsx` and `page.tsx`, the create-next-app defaults ("To get started, edit the page.tsx file"). No GrowthOS pages, backend, or docs exist yet — don't expect or hunt for them.
- No commits yet — the whole tree is untracked, so there is no history to learn from.
- README.md is still the create-next-app template; treat it as placeholder, not product docs.

## Commands

- `npm run dev` — dev server, open http://localhost:3000.
- `npm run build` / `npm run start`.
- `npm run lint` runs bare `eslint` with no files — passes silently; lint explicitly, e.g. `npx eslint app`.
- Node `>= 20.9` (Next engines). Installed: v22.14.0.

## Tech facts

- TypeScript: strict, bundler moduleResolution, `@/*` alias → repo root (tsconfig).
- Tailwind v4 — `globals.css` starts `@import "tailwindcss";` and uses `@theme inline` tokens (`--color-background`, `--color-foreground`, `--font-geist-sans`, `--font-geist-mono`).
- ESLint: `eslint-config-next` (core-web-vitals + typescript).
- `next.config.ts`: `cacheComponents` and `partialPrefetching` enabled; turbopack CSS rule via `@tailwindcss/turbopack`.

## Product context

GrowthOS is an AI-powered growth operating system for digital-first businesses — SaaS, e-commerce, agencies, online services. Workflow: Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn. This repo builds Phase 0, the product shell; the platform (FastAPI + PostgreSQL backend, AI provider abstraction, docs) comes in later phases.

## Development standards

- Production-quality UI and UX: premium, professional B2B SaaS feel — clean typography, strong visual hierarchy, subtle borders/shadows, responsive across devices, accessible; no generic dashboard aesthetics.
- Fully working features, not mockups: real behavior or clearly labelled demonstration data.
- No fabricated metrics, fake integrations or invented results.
- Comprehensive testing and verification: run lint, typecheck and tests, start the app and verify features work; don't mark anything complete unverified.
- Detailed implementation and documentation.
- Frequent, meaningful commits; write natural, human-sounding commit messages; push to the remote after milestones whenever a remote is configured.
