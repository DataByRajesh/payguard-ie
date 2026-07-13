# Local Postgres Setup and Troubleshooting

PayGuard IE runs on PostgreSQL everywhere — locally via Docker Compose, and in the cloud via a managed Postgres provider (Phase 1B) — so local development matches production/preview behaviour for transactions, constraints, indexes, date handling and concurrency. There is no SQLite anywhere in this project anymore.

## One-time setup

```bash
pnpm install
cp .env.example .env
pnpm db:local:start   # starts Postgres via Docker Compose
pnpm db:migrate       # applies migrations to payguard_dev
pnpm db:seed          # loads deterministic demo data
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## What Docker Compose provisions

`docker-compose.yml` starts a single `postgres:16-alpine` container (`payguard-ie-postgres`), bound only to `127.0.0.1:5432` — never exposed beyond your machine. `docker/postgres/init-additional-databases.sh` runs once, on first container creation, and creates three isolated databases inside that one Postgres instance:

| Database | Used by | Reset by |
| --- | --- | --- |
| `payguard_dev` | `pnpm dev`, manual testing | `pnpm demo:reset` |
| `payguard_vitest` | `pnpm test` (Vitest) | `pretest` script, automatically |
| `payguard_test` | `pnpm test:e2e` (Playwright) | `pretest:e2e` script, automatically |

Credentials (`payguard` / `payguard`) are local-only, hardcoded in `docker-compose.yml` and the `.env*.example` templates — never used for anything beyond this container, and never valid against a Preview/Production database (see `docs/SECURITY_AND_LIMITATIONS.md`).

## How resets work

`prisma migrate reset` in this Prisma version has no flag to skip its automatically-configured seed step, but the Vitest suite needs a clean *unseeded* schema (it manages its own fixtures). `scripts/reset-postgres-schema.ts` handles this directly — it drops and recreates the `public` schema via a plain `pg` connection, then each caller (`scripts/setup-vitest-db.ts`, `scripts/setup-e2e-db.ts`, `scripts/demo-reset.ts`) runs `prisma migrate deploy` and, where seeding is wanted, `prisma db seed` afterward.

- `pnpm test` / `pnpm test:e2e` reset their database automatically every run (via the `pretest`/`pretest:e2e` scripts) — you never need to do this by hand.
- `pnpm demo:reset` resets **only** `payguard_dev`, the interactive database — safe to run any time you want to discard whatever you've clicked around and mutated.

## Troubleshooting

**`docker compose up` fails with a port conflict on 5432**
Something else on your machine (a native Postgres install, another project's container) is already bound to 5432. Either stop it, or change the host port in `docker-compose.yml`'s `ports:` mapping (e.g. `127.0.0.1:5433:5432`) and update `DATABASE_URL` in your `.env*` files to match.

**`ECONNREFUSED` connecting to Postgres**
The container isn't running or hasn't finished starting yet. Run `pnpm db:local:start`, then `docker compose ps` to confirm it's `healthy` (the healthcheck polls `pg_isready` every 5s, up to 10 times) before running migrations.

**Only `payguard_dev` exists — `payguard_vitest`/`payguard_test` are missing**
`docker-entrypoint-initdb.d` scripts (including `init-additional-databases.sh`) only run the *first* time a container initializes an empty data volume — never on restarts. If the container crashed mid-init on an earlier attempt (check `docker compose logs postgres` for errors from `init-additional-databases.sh`), the volume can end up half-initialized and skip the script on every subsequent start. Fix: `docker compose down -v` (destroys the local Postgres volume — safe, it's disposable local dev data) then `pnpm db:local:start` again for a clean re-init.

**"Another next dev server is already running"**
This Next.js version refuses to start a second dev server against the same project directory and prints the PID of the one already running (`taskkill /PID <pid> /F` on Windows, `kill <pid>` elsewhere) rather than silently binding a different port forever. If you started a dev server in a background/detached shell and lost track of it, this message is how you find it again.

**Migration drift after pulling new schema changes**
Run `pnpm db:migrate` (`prisma migrate dev`) locally to apply and generate any new migrations against `payguard_dev`. If your local `payguard_dev` schema has diverged unrecoverably (e.g. you hand-edited data or ran raw SQL against it), `pnpm demo:reset` rebuilds it from scratch.

**Seed fails with a foreign-key or unique-constraint error**
The seed script (`prisma/seed.ts`) assumes it's running against an empty, freshly-migrated schema — it's not idempotent against a partially-seeded database. Reset first (`pnpm demo:reset`, or `pnpm db:reset` which does migrate-reset-and-seed in one step) rather than re-running `pnpm db:seed` on top of existing data.
