# vantathrive-testing-dashboard-dev

Internal QA dashboard for exercising VantaThrive flows against the **mirror** Supabase database. This repo is a fork/evolution of `testing-dashboard`, extended with admin program-builder tooling in later workstreams.

## Mirror database only

**This app must only connect to the mirror Supabase project:**

`https://bzsloubjksvbnosoymwu.supabase.co`

Do **not** point environment variables at production. The mirror is a copy of `vantaverse-backend` data for safe QA and operator testing.

## Authentication

Operator login is email + password only (no signup). Only `@flywheel.so` emails may authenticate; accounts must already exist in mirror Auth.

## Environment variables

Copy `.env.example` to `.env.local` and fill in keys from the mirror project (Supabase Dashboard → Settings → API):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Mirror Supabase URL (default in `.env.example`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key — Auth/session cookies |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only data access (never expose as `NEXT_PUBLIC_`) |

`.env.local` is gitignored. Do not commit real keys.

## Setup

Requires [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local with mirror anon + service_role keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm db:types` | Regenerate Supabase TypeScript types (use mirror project id when updated) |

## Package manager

This repo uses **pnpm** only (`pnpm-lock.yaml`). Do not use npm or bun lockfiles here.
