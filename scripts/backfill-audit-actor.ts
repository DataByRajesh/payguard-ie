import { prisma } from "../lib/db";
import { resolveActorUserId } from "./backfill-audit-actor-logic";

/**
 * One-time data migration for Cloud Phase 2.3 (AuditEvent.actor -> actorUserId): matches each
 * pre-migration event's legacy `actor` name string to a User by name, falling back to the
 * service-account user (system@payguard-ie.internal) for anything unmatched -- including the
 * literal "SYSTEM" placeholder the reconciliation engine used to write.
 *
 * Uses raw SQL rather than the Prisma Client API because the columns it reads (`actor`, and
 * `actorUserId` as nullable) no longer exist in the current schema once the companion contract
 * migration (20260714194150_audit_event_actor_user_id_required) has run -- this script only makes
 * sense run against a database that still has the intermediate, pre-contract shape (the expand
 * migration applied, the contract migration not yet applied). In practice that's a local dev
 * database with real history from before this Phase 2.3 upgrade that you'd rather preserve than
 * wipe with `pnpm db:reset`; the public Preview/Production databases can never accumulate
 * old-format rows in the first place, since DEMO_READ_ONLY blocks every mutating action there
 * (see docs/SECURITY_AND_LIMITATIONS.md) and seeding always writes actorUserId directly.
 */
async function main() {
  const [systemUser] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE email = 'system@payguard-ie.internal'
  `;
  if (!systemUser) {
    throw new Error("Service-account user (system@payguard-ie.internal) not found -- run `prisma db seed` first.");
  }

  const events = await prisma.$queryRaw<{ id: string; actor: string | null }[]>`
    SELECT id, actor FROM "AuditEvent" WHERE "actorUserId" IS NULL
  `;
  if (events.length === 0) {
    console.log("No AuditEvent rows need backfilling.");
    return;
  }

  const users = await prisma.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM "User"`;
  const usersByName = new Map(users.map((user) => [user.name, user.id]));

  let matched = 0;
  let fellBackToSystem = 0;
  for (const event of events) {
    const actorUserId = resolveActorUserId(event.actor, usersByName, systemUser.id);
    if (actorUserId === systemUser.id) fellBackToSystem += 1;
    else matched += 1;
    await prisma.$executeRaw`UPDATE "AuditEvent" SET "actorUserId" = ${actorUserId} WHERE id = ${event.id}`;
  }

  console.log(`Backfilled ${events.length} audit events (${matched} matched by name, ${fellBackToSystem} fell back to the service account).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
