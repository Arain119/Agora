function clampInt(raw: unknown, fallback: number, min: number, max: number) {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : typeof raw === 'number' ? raw : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

export function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

export const UPSTREAM_FAILURE_THRESHOLD = clampInt(process.env.UPSTREAM_FAILURE_THRESHOLD, 2, 1, 20);
export const UPSTREAM_COOLDOWN_BASE_SECONDS = clampInt(process.env.UPSTREAM_COOLDOWN_BASE_SECONDS, 10, 1, 3600);
export const UPSTREAM_COOLDOWN_MAX_SECONDS = clampInt(process.env.UPSTREAM_COOLDOWN_MAX_SECONDS, 300, 1, 86400);

export function computeCooldownUntil(now: Date, nextConsecutiveFailures: number, statusCode: number) {
  if (nextConsecutiveFailures < UPSTREAM_FAILURE_THRESHOLD) return null;

  // Backoff:
  // - 429s usually mean key-level throttling => cooldown more aggressively.
  const base =
    statusCode === 429 ? UPSTREAM_COOLDOWN_BASE_SECONDS : Math.max(1, Math.floor(UPSTREAM_COOLDOWN_BASE_SECONDS / 2));
  const exponent = nextConsecutiveFailures - UPSTREAM_FAILURE_THRESHOLD;
  const seconds = Math.min(UPSTREAM_COOLDOWN_MAX_SECONDS, Math.floor(base * Math.pow(2, exponent)));
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

