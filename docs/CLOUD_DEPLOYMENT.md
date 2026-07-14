# Cloud Deployment (Phase 1B)

This is the runbook for standing up the public PayGuard IE demo on Vercel — a dedicated project, isolated Preview and Production Postgres databases, and the safety guards that make it safe to leave publicly reachable behind a shared demo login (Cloud Phase 2.1). Steps marked **(dashboard/CLI)** need to be done by whoever owns the Vercel account — provisioning a billed resource and completing OAuth login aren't things that can be automated from this repo.

## Why this needs manual steps

Everything in this repo (code, migrations, the `DEMO_READ_ONLY` guard below) is fully automatable. Three things aren't, and have no API/MCP equivalent used here: connecting this GitHub repo to a new Vercel project, provisioning a Postgres database from the Vercel Marketplace, and setting per-environment secrets. All three require the account owner's own dashboard session or an authenticated `vercel login`.

## 1. Create the project **(dashboard)**

Vercel dashboard → **Add New… → Project → Import Git Repository** → select `DataByRajesh/payguard-ie`. This single action creates the `payguard-ie` project *and* connects it to GitHub, so every push to `main` becomes a Production deployment and every other branch/PR becomes a Preview deployment automatically — the standard Vercel workflow, not something worth reproducing with a one-off file upload instead.

Framework preset: Next.js (auto-detected). Package manager: pnpm (auto-detected from `pnpm-lock.yaml`). Don't deploy yet — add the database and environment variables first (step 2–3), or the first build will fail with no `DATABASE_URL`.

## 2. Add Postgres — two isolated databases **(dashboard)**

Project → **Storage → Create Database → Postgres** (Neon, via the Vercel Marketplace). Create **two** databases (or two Neon branches within one project — either satisfies "isolated" here), never one shared between environments:

- `payguard-ie-preview`
- `payguard-ie-production`

## 3. Environment variables **(dashboard)**

Project → **Settings → Environment Variables**. Vercel lets you scope each variable to Preview and/or Production independently — use that, don't reuse one value across both:

| Variable | Preview | Production |
| --- | --- | --- |
| `DATABASE_URL` | `payguard-ie-preview` connection string | `payguard-ie-production` connection string |
| `DEMO_READ_ONLY` | `true` | `true` |
| `SESSION_SECRET` | a distinct random value (e.g. `openssl rand -base64 32`) | a **different** distinct random value |
| `SEED_USER_PASSWORD` | the shared demo-login password to seed (step 5) | the shared demo-login password to seed (step 5) |

**`DEMO_READ_ONLY=true` in both.** The public demo rules (no real payment submission, reconciliation execution disabled for anonymous visitors, write workflows safely isolated) are all satisfied by one flag: every mutating Server Action (`lib/demo-mode.ts`, wired into `lib/actions/*.ts`) returns a clear "read-only demo" message instead of touching the database when this is set. Local dev, Vitest and Playwright never set it, so the full interactive workflow stays fully testable — only the public deployment is locked down. This is independent of and composes with the login requirement below (Cloud Phase 2.1) — every visitor, logged in or not, hits the same read-only guard on the public deployment.

**`SESSION_SECRET` must be a real, distinct value per environment** — never reuse the local-dev fallback baked into `lib/auth/session.ts`, and never reuse the same value across Preview and Production (a leaked Preview secret would let someone forge a valid Production session cookie). See `docs/SECURITY_AND_LIMITATIONS.md` for what this cookie does and doesn't protect against.

## 4. First deploy and migrations **(automatic)**

Trigger a deploy (push to `main`, or redeploy from the dashboard now that env vars are set). The build runs `vercel-build` (`package.json`) — `prisma migrate deploy && next build` — which applies every committed migration to whichever `DATABASE_URL` that environment resolves to before building. This is why migrations must already be committed (`prisma/migrations/`) before deploying; this project never generates a migration against a cloud database, only applies ones already reviewed and committed from local development.

## 5. Seed each database — once, from your machine **(CLI, one-off)**

Seeding is deliberately **not** part of the build step (re-running it on every deploy against non-empty data isn't idempotent — see `docs/LOCAL_POSTGRES_SETUP.md`) and deliberately **not** an HTTP endpoint (no anonymous destructive reset, per the public demo rules). Run it once per database, from your own machine, after the schema is migrated:

```bash
vercel env pull .env.preview.local --environment=preview
DATABASE_URL=$(grep DATABASE_URL .env.preview.local | cut -d= -f2- | tr -d '"') pnpm exec tsx prisma/seed.ts

vercel env pull .env.production.local --environment=production
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2- | tr -d '"') pnpm exec tsx prisma/seed.ts
```

Re-running later re-seeds from empty — reset first (`pnpm exec prisma migrate reset --force` against that `DATABASE_URL`) if the demo data needs restoring to its original state, exactly like `pnpm demo:reset` does locally. Each seeded user's password is hashed from that environment's `SEED_USER_PASSWORD` (pulled automatically by `vercel env pull` above) — every user shares that one password, as on `/login`.

## 6. Verify

- Open the Preview and Production URLs; confirm you're redirected to `/login`, and that logging in with any seeded user's email + the environment's `SEED_USER_PASSWORD` succeeds and reaches `/dashboard`.
- Confirm `/dashboard`, `/payments`, `/exceptions`, `/reports` all render seeded data.
- Confirm the read-only guard: attempt any mutation (e.g. "Run reconciliation") and confirm it returns the "read-only demo" message rather than actually running.
- Confirm `/reports/*` exports still work (they're reads, unaffected by `DEMO_READ_ONLY`) and don't expose raw database IDs — every export column uses human-readable reference codes (`caseReference`, `paymentReference`, etc.), never a Prisma `id`.

## Rollback

- **Application code**: Vercel dashboard → Deployments → pick a previous deployment → **Instant Rollback** (or `vercel rollback` via CLI). This repoints the domain at a previous build immediately, no rebuild — the fastest way back to a known-good state.
- **Schema/migrations**: this project's migrations are forward-only — there are no authored "down" migrations (standard for this stage of a project; see `docs/DATA_MODEL.md`). Rolling back application code does **not** revert a schema change that already ran. A bad migration needs either (a) a new forward migration that undoes it, committed and deployed normally, or (b) restoring the managed Postgres provider's point-in-time backup (Neon supports PITR) if data was corrupted, not just the schema. This asymmetry — instant code rollback, deliberate schema rollback — is why `vercel-build` only ever applies committed, already-reviewed migrations rather than generating new ones against a live database.

## After both environments are verified

Tag the commit: `git tag v1.1.0-cloud-demo && git push origin v1.1.0-cloud-demo` — this is the marker the two-phase migration plan uses for "local and cloud Phase 1 both verified."
