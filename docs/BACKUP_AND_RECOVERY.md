# Backup and Recovery

This is the runbook for what to do when data in a PayGuard IE database (local, Preview or Production) needs to be restored — a bad migration, an accidental destructive action, or corrupted data. It complements [CLOUD_DEPLOYMENT.md#rollback](CLOUD_DEPLOYMENT.md#rollback), which covers rolling back *application code* (instant, via Vercel) — this doc is specifically about *data*.

## What's already covered, and by what

| Environment | Backup mechanism | Who manages it |
| --- | --- | --- |
| Local (`payguard_dev`, Docker) | None — deliberately disposable. `pnpm demo:reset` / `pnpm db:reset` rebuild it from the seed script in seconds. | You; nothing to configure |
| Preview / Production (Neon, via Vercel Marketplace) | Point-in-time recovery (PITR) | Neon, automatically |

**Local Postgres has no backup story, on purpose** — see [SECURITY_AND_LIMITATIONS.md#local-postgres-no-backuprplication-story](SECURITY_AND_LIMITATIONS.md#local-postgres-no-backuprplication-story). If local data matters to you specifically (not just the seeded demo dataset), that's on you to `pg_dump` yourself; this project doesn't automate it, since every other local workflow already assumes the database is freely disposable.

**Preview/Production rely entirely on Neon's own PITR** — this project does not run its own scheduled backup job. Before relying on this in a real incident, confirm the actual retention window in the Neon dashboard (Project → Backups/History) rather than trusting a number written here, since retention depends on the Neon plan tier and can change.

## Manual logical backup (`pg_dump`)

Useful as a second safety net before a risky migration, or to keep an off-Neon copy. Run from your own machine against whichever `DATABASE_URL` you want to snapshot:

```bash
# Local
pg_dump "postgresql://payguard:payguard@localhost:5432/payguard_dev" -F c -f backup-dev-$(date +%Y%m%d%H%M%S).dump

# Preview / Production -- pull the real connection string first
vercel env pull .env.preview.local --environment=preview
pg_dump "$(grep DATABASE_URL .env.preview.local | cut -d= -f2- | tr -d '"')" -F c -f backup-preview-$(date +%Y%m%d%H%M%S).dump
```

`-F c` (custom format) is compressed and restorable selectively; keep the resulting `.dump` file out of git (it's not covered by an existing `.gitignore` pattern here — name your backups directory something already ignored, e.g. under `.data/`, or add your own entry, since these files may contain synthetic-but-realistic data).

To restore a logical backup:

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" backup-preview-20260101120000.dump
```

`--clean --if-exists` drops existing objects before recreating them from the dump — appropriate for a full restore, not for merging into a database you want to keep other data in.

## Restoring via Neon PITR

For Preview/Production, PITR is the primary recovery path (no manual `pg_dump` needed, assuming the corruption happened recently enough to be within the retention window):

1. Neon dashboard → the affected project/branch → **Restore** (or **Branches → Restore to a point in time**, depending on Neon's current UI).
2. Pick a timestamp before the bad change. Neon either restores in place or creates a new branch at that point — if it creates a branch, you'll need to point the Vercel environment's `DATABASE_URL` at the new branch's connection string (Project → Storage → the Postgres integration → update the env var) and redeploy.
3. Verify (see checklist below) before removing the pre-restore branch/snapshot, in case the restore itself needs correcting.

## Incident checklist

Follow this order — don't skip straight to restoring:

1. **Contain**: if the public demo is affected, set `DEMO_READ_ONLY=true` on that environment if it isn't already (docs/CLOUD_DEPLOYMENT.md) so nothing else mutates the data while you investigate.
2. **Diagnose**: is this an application bug (safe to fix forward with a new migration/deploy) or genuine data corruption/loss (needs a restore)? Most schema mistakes at this project's stage are fixable with a forward migration — see [CLOUD_DEPLOYMENT.md#rollback](CLOUD_DEPLOYMENT.md#rollback) on why this project only ever writes forward migrations.
3. **Restore** (only if step 2 concluded data itself is bad): Neon PITR for Preview/Production (above), or re-seed for local (`pnpm demo:reset` / `pnpm db:reset` — local data is synthetic and disposable, so this is almost always the right answer locally rather than a `pg_restore`).
4. **Verify**: confirm `/dashboard`, `/exceptions`, `/payments` render correctly; spot-check a few records against what you expect; confirm migrations are at the expected version (`pnpm exec prisma migrate status`).
5. **Un-contain**: unset `DEMO_READ_ONLY` if you set it in step 1 and it isn't meant to stay set for that environment.

## What this doesn't cover

There's no automated backup verification (a scheduled job that restores a backup somewhere and confirms it's readable) and no cross-region replication — both are standard next steps for a system holding real data, out of scope for a project whose data is entirely synthetic. See [SECURITY_AND_LIMITATIONS.md](SECURITY_AND_LIMITATIONS.md) for the full list of deliberate scope boundaries.
