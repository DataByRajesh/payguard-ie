import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const WINDOW_MS = 60_000;
const DEFAULT_MAX_PER_WINDOW = 20;
const PRUNE_PROBABILITY = 0.05;
const PRUNE_AGE_MS = WINDOW_MS * 10;

const RATE_LIMITED_MESSAGE = "You're doing that too often. Please wait a moment and try again.";

function windowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

/** Same early-return guard-clause shape as demoReadOnlyResult()/requirePermission() -- returns a
 * failure result once `userId` has made more than `max` calls to `action` within the current
 * fixed window, or null if the caller should proceed. A fixed window (not sliding) can allow a
 * short burst right at the window boundary -- an accepted, documented trade-off at this scale,
 * same "named limitation" style as the reconciliation engine's duplicate-detection heuristic. */
export async function checkRateLimit<R extends { success: boolean; message: string } = { success: boolean; message: string }>(
  userId: string,
  action: string,
  options: { max?: number; now?: Date } = {},
): Promise<R | null> {
  const max = options.max ?? DEFAULT_MAX_PER_WINDOW;
  const now = options.now ?? new Date();
  const startAt = windowStart(now);

  const counter = await prisma.rateLimitCounter.upsert({
    where: { userId_action_windowStartAt: { userId, action, windowStartAt: startAt } },
    create: { userId, action, windowStartAt: startAt, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Opportunistic cleanup -- no cron needed at this scale; every call has a small chance to prune
  // windows old enough that nothing could still be reading them.
  if (Math.random() < PRUNE_PROBABILITY) {
    void prisma.rateLimitCounter
      .deleteMany({ where: { windowStartAt: { lt: new Date(now.getTime() - PRUNE_AGE_MS) } } })
      .catch((error) => logger.error("rate_limit_prune_failed", { error }));
  }

  if (counter.count > max) {
    logger.warn("rate_limit_exceeded", { userId, action, count: counter.count, max });
    return { success: false, message: RATE_LIMITED_MESSAGE } as R;
  }
  return null;
}
