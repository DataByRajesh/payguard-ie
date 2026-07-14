import { Client } from "pg";

/**
 * Drops and recreates the `public` schema so the database starts genuinely empty before
 * migrations are (re)applied. Used instead of `prisma migrate reset` because this Prisma version's
 * `migrate reset` has no way to opt out of running the configured seed command (see
 * prisma.config.ts) — some callers (the Vitest suite) need a clean, unseeded schema.
 */
export async function resetPostgresSchema(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end();
  }
}
