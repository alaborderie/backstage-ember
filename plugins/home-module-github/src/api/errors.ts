/** Why a GitHub call failed, as the widgets explain it. @public */
export type GithubFailure =
  | { kind: 'rate-limited'; status: number; resetAt?: number }
  | { kind: 'unauthorized'; status: number }
  | { kind: 'unavailable'; status?: number; detail: string };

/** @public */
export class GithubHomeError extends Error {
  readonly failure: GithubFailure;

  constructor(failure: GithubFailure, message: string) {
    super(message);
    this.name = 'GithubHomeError';
    this.failure = failure;
  }
}

/** Parses `x-ratelimit-reset` (epoch seconds) or `retry-after` (seconds). */
export function rateLimitResetAt(headers: Headers, now: number): number | undefined {
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) return reset * 1000;
  const retryAfter = Number(headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return now + retryAfter * 1000;
  return undefined;
}

export function toGithubFailure(error: unknown): GithubFailure {
  if (error instanceof GithubHomeError) return error.failure;
  return {
    kind: 'unavailable',
    detail: error instanceof Error ? error.message : String(error),
  };
}
