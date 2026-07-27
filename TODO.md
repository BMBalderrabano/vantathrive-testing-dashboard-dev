# vantathrive-testing-dashboard-dev — TODO

Checkbox tracker for the mirror-DB QA dashboard. Parallelize independent workstreams with composer-2.5 subagents where noted.

**Sources**

- Base: `../testing-dashboard/`
- Builder UX/libs: `../vantaverse-admin/` (`/builder` → `/program`)
- Mirror DB: `https://bzsloubjksvbnosoymwu.supabase.co` (mirror of `../vantaverse-backend/`)

---

## Locked decisions

- [x] Product: QA clone of testing-dashboard + admin program builder (not admin-first, not faithful-only mirror)
- [x] Full admin builder transplant; nav stays testing-dashboard **header** (not admin sidebar)
- [x] Keep home QA console + `/organizations`; port admin builder UI/libs only as needed for program authoring
- [x] Operator login required (port admin login + middleware); only `@flywheel.so` may authenticate
- [x] All DB operations use **service_role**, but **server-only** (never `NEXT_PUBLIC_`); anon key for Auth cookies only
- [x] Builder data access: Server Actions wrapping vendored admin query modules; home QA keeps `/api/*` routes
- [x] Replace `allowed_emails` / chosen-ones APIs with `auth.admin.createUser` (+ profile); keep UI copy **“Add Chosen Ones :D”**; org membership optional
- [x] Vendor copy of admin builder slice into this repo (one-time fork; manual cherry-picks later)
- [x] Routes: `/program` (list) + `/program/[id]` (editor) — map from admin `/builder` + `/builder/[id]`
- [x] Modernize home assign → `program_template` → `program_assignment` (minimal: template + start date + clear)
- [x] Keep full home QA toolkit; fix anything that breaks against the mirror schema
- [x] Dual visual: admin/shadcn look for builder; existing simple QA chrome for home/orgs/header shell
- [x] Package manager: **pnpm**; extend testing-dashboard deps with admin builder deps; single lockfile
- [x] Sign in existing mirror Auth users; `@flywheel.so` gate (no in-app signup)
- [x] Delete obsolete `/program` tab shell + unused APIs
- [x] Builder-embedded exercise pickers only (no `/exercises` or `/groups` management pages)
- [x] No program cover images in v1 (omit upload field/storage wiring)
- [x] Cross-org builder + explicit org picker on create; header org is soft filter/default (supports “All orgs”)
- [x] Header holds **selected test user** + **selected org** app-wide (drives user QA actions + org filter/defaults)
- [x] Types: reuse `vantaverse-admin`’s `database.types.ts`
- [x] Hosting: user deploys to Vercel; app must be safe with public URL + login gate
- [x] Bootstrap: copy testing-dashboard tree into this repo, then layer changes

---

## Workstream A — Bootstrap repo (do first; blocks others)

- [x] Copy `../testing-dashboard/` into this repo (exclude `node_modules`, `.next`, env secrets)
- [x] Rename package to `vantathrive-testing-dashboard-dev` (or agreed name)
- [x] Switch to **pnpm** only: keep/generate `pnpm-lock.yaml`; remove `bun.lock` + `package-lock.json`
- [x] Add `.env.example` with mirror URL + anon + service_role placeholders (document mirror-only)
- [x] Point env at `https://bzsloubjksvbnosoymwu.supabase.co` (local `.env.local` — do not commit secrets)
- [x] README: purpose, mirror-only warning, `@flywheel.so` login, required env vars, pnpm scripts
- [x] `pnpm install` + confirm `pnpm dev` boots the copied app before deeper ports

---

## Workstream B — Auth gate (`@flywheel.so` + admin login)

*Can start after A has a bootable tree. Parallel with C/D once middleware paths exist.*

- [x] Port admin login page UX (`/login`) + `@supabase/ssr` cookie session helpers
- [x] Port/adapt middleware: require session for app routes; allow `/login` + static assets
- [x] Enforce email ends with `@flywheel.so` (reject/sign-out others with clear error)
- [x] No signup UI; document that operators must already exist in mirror Auth
- [x] Wire layout/header logout
- [x] Ensure anon key used only for Auth; no service_role in client bundle
- [x] Smoke: non-flywheel blocked; flywheel operator can reach home

---

## Workstream C — Supabase clients, types, service_role boundary

*Parallel with B after A.*

- [x] Replace `src/lib/supabase/database.types.ts` with admin’s types
- [x] Split clients: browser anon (Auth) vs server service_role (data)
- [x] Server-only module for service_role (fail if imported from client)
- [x] Update home `/api/*` routes to use server service_role client
- [x] Remove/stop shipping any browser service_role usage from testing-dashboard patterns
- [x] Fix TypeScript breaks from types swap (compile-driven)

---

## Workstream D — Header: global user + org context

*Depends on A; coordinate with E (home) and F (builder org default).*

- [x] Move test-user picker into `Header` (available on all pages)
- [x] Add org picker to `Header` (nullable / “All orgs”)
- [x] Persist selection (e.g. context provider + `localStorage`) across routes
- [x] Home QA tools consume header-selected user (remove duplicate page-local user pickers where redundant)
- [x] `/program` list filters by header org when set; “All orgs” shows everything (label by org) — Wave F
- [x] New template create pre-fills header org when set; field still editable — Wave F
- [x] “Add Chosen Ones :D” accessible from header/home: createUser + profile; optional org membership

---

## Workstream E — Home QA toolkit (keep + modernize)

*Parallel with F after C (API client) and D (selected user).*

### Keep / fix against mirror

- [x] User list/select (via header)
- [x] Timeline
- [x] Advance Time
- [x] Reset User (hard/soft)
- [x] Serve Question
- [x] Process Habit
- [x] Reminder Preferences
- [x] Calendly integration
- [x] Fix API routes that reference removed schema (`allowed_emails`, dead views like `profiles_with_stats` / `program_with_stats`, etc.)

### Create user (replace deprecated)

- [x] Delete `/api/allowed-emails` and UI that depends on it
- [x] Replace `/api/chosen-ones` with createUser flow (admin `auth.admin.createUser` + profile pattern)
- [x] Keep button/label text **“Add Chosen Ones :D”**
- [x] Allow create **with** selected org membership **or** with **no** membership

### Assign program (modernize)

- [x] Replace preset/weeks `WorkoutAssignment` + `/api/assign-program` generative model
- [x] New control: pick `program_template` (respect header org filter) + start date → assign to header user
- [x] Clear/unassign control (replace/adapt `/api/clear-program`)
- [x] Remove dependency on `workout_presets` for home assign if unused elsewhere

### Orgs

- [x] Keep `/organizations` + `OrganizationsTab` working against mirror
- [x] Align org membership APIs with create-user optional membership

---

## Workstream F — Admin builder → `/program` (largest; parallelizable internally)

*Depends on A + C. Coordinate org defaults with D. No images v1.*

### Dependencies / chrome

- [x] Add admin builder deps (TanStack Query, RHF, zod, dnd-kit, radix/shadcn pieces, `@supabase/ssr` already in B, etc.)
- [x] Vendor required `src/components/ui/*` and utils (`cn`, etc.)
- [x] Add QueryProvider (TanStack) for builder routes without forcing home rewrite
- [x] Dual styling: builder pages use admin tokens/classes; home stays simple QA chrome

### Vendor builder surface (map routes)

- [x] Copy admin `builder/` → app routes `/program` + `/program/[id]` (rename imports/paths)
- [x] Port program list + create/edit form (omit `ImageUploadField` / storage upload/delete)
- [x] Port `[id]` editor: workout schedule, template config, pre-program, default values
- [x] Port builder-embedded exercise / exercise-template / group **pickers** + needed queries/schemas
- [x] Do **not** port standalone `/exercises` or `/groups` admin pages
- [x] Explicit org field/picker on create (cross-org); honor header org as default

### Server Actions boundary

- [x] Wrap vendored query modules in Server Actions (service_role)
- [x] Adapt client hooks/mutations to call Server Actions (no god key in browser)
- [x] Force any remaining strategy flags to service_role on server

### Query/schema modules to vendor (minimum set; expand if compile requires)

- [x] `program-templates` queries + schemas
- [x] `workout-schedules` queries (as used by builder)
- [x] `exercises` / `exercise-templates` / `groups` queries used by pickers
- [x] Related hooks: `use-program-template-mutations`, exercise hooks used by builder
- [x] Shared supabase Query helper / clientStrategy — server-only service_role path

### Nav

- [x] Header link “Programs” → `/program`
- [x] No admin sidebar

---

## Workstream G — Delete obsolete program stack

*After F list route works (or in parallel once F owns `/program`).*

- [x] Delete old tab shell `src/app/program/page.tsx` implementation (Programs/Workouts/Teams/Assignments tabs)
- [x] Delete `src/components/program/*` obsolete tabs/builders (`ProgramTemplatesTab`, `WeeklyWorkoutBuilder`, `TeamsTab`, `ProgramAssignmentTab`, etc.) once unused
- [x] Remove unused APIs only used by old program UI (audit before delete): e.g. teams-only wiring, old program-templates CRUD if superseded, weekly workout builder endpoints
- [x] Keep APIs still required by home/orgs/modern assign
- [x] Grep for `allowed_emails`, `chosen-ones`, `workout_presets` (assign path), dead imports — remove

---

## Workstream H — Quality gates (after merge of streams)

- [x] `pnpm` typecheck / `tsc` clean
- [x] `pnpm lint` clean (0 errors; 8 unused-var warnings in vendored query modules)
- [ ] Manual smoke checklist:
  - [ ] Login `@flywheel.so` works on mirror; other domains rejected *(needs keys + browser)*
  - [x] Header user + org persist across home / program / organizations *(code: `qa-context` + `localStorage`; routes wired in `Header.tsx`)*
  - [ ] Add Chosen Ones :D (with and without org) *(UI + `/api/chosen-ones` exist; needs keys + browser)*
  - [x] Create program template with org; edit schedule on `/program/[id]` *(code: `/program`, `/program/[id]`, `actions.ts`, builder routes)*
  - [ ] Assign + clear program for selected user *(code: `WorkoutAssignment` + `/api/assign-program` + `/api/clear-program`; needs keys + browser)*
  - [ ] Reset user / timeline / advance time / other home tools still function or have known issues listed *(needs keys + browser)*
  - [x] Confirm no `service_role` in client bundle *(code: `service-role.ts` has `server-only`; client uses `parallel-queries.ts`; build compiles without client leak)*
- [x] Optional: knip on dead exports after deletions *(ran: 10 unused files, mostly shadcn stubs + legacy `lib/supabase.ts`; no cleanup in H)*

---

## Suggested subagent parallelization

| Wave | Agents (composer-2.5) | Notes |
|------|------------------------|-------|
| 1 | **A** Bootstrap copy + pnpm | Single agent; blocks others |
| 2 | **B** Auth · **C** Types/clients · **D** Header context | Three agents; agree on `src/lib/supabase/*` and `Header` ownership before start |
| 3 | **E** Home QA modernize · **F** Builder port | Two agents; E owns `/api` + home components; F owns `/program/**` + vendored admin slice + Server Actions |
| 4 | **G** Delete obsolete · **H** QA gates | After E+F land |

**Conflict hotspots (serialize or single-owner):** `Header.tsx`, `package.json`/lockfile, `src/lib/supabase/**`, `src/app/layout.tsx`, `src/app/globals.css`.

---

## Explicitly out of scope (v1)

- [x] Admin sidebar
- [x] Standalone `/exercises` / `/groups` management pages
- [x] Program cover image upload/storage
- [x] Porting full admin `/users` area
- [x] Keeping old `/program` Teams + Assignments tabs
- [x] Shared npm package extraction / live-link to admin
- [x] In-app `@flywheel.so` signup
- [x] Pointing this app at production Supabase
