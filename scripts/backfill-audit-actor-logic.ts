/** Pure matching rule for scripts/backfill-audit-actor.ts, split into its own module so it can be
 * unit tested without importing (and thereby executing) the script's side-effecting main().
 *
 * A null/unmatched legacy `actor` name string always falls back to the service-account user,
 * matching the historical "SYSTEM" placeholder and any other name that no longer corresponds to
 * a seeded User (e.g. a deleted/renamed user). */
export function resolveActorUserId(actorName: string | null, usersByName: ReadonlyMap<string, string>, systemUserId: string): string {
  return (actorName ? usersByName.get(actorName) : undefined) ?? systemUserId;
}
