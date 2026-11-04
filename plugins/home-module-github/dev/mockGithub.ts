import { issueFixtures, pullRequestFixtures } from './fixtures';

/**
 * Answers GitHub GraphQL calls in the dev app with fictional data, so the real
 * client, its pagination and its error handling run without a token.
 *
 * `?github=` picks the state: `live` (default), `loading`, `empty`,
 * `ratelimit`, `expired` or `error`. `?fresh` clears the cached snapshots first.
 */
const PAGE_SIZE = 25;
const LATE_PR_AFTER_MS = 16_000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

export function installGithubMock() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('github') ?? 'live';
  if (params.has('fresh')) {
    Object.keys(window.localStorage)
      .filter(key => key.includes('home.github'))
      .forEach(key => window.localStorage.removeItem(key));
  }
  const startedAt = Date.now();
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith('https://api.github.com/graphql')) return realFetch(input, init);

    await new Promise(resolve => setTimeout(resolve, 450));
    if (mode === 'loading') return new Promise<Response>(() => undefined);
    if (mode === 'expired') return json({ message: 'Bad credentials' }, 401);
    if (mode === 'error') return json({ message: 'Server Error' }, 502);
    if (mode === 'ratelimit') {
      return json({ message: 'API rate limit exceeded' }, 403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 11 * 60_000) / 1000)),
      });
    }

    const { query, variables } = JSON.parse(String(init?.body)) as {
      query: string;
      variables: { q?: string; cursor?: string | null };
    };
    if (query.includes('viewer')) return json({ data: { viewer: { login: 'acme' } } });

    const now = Date.now();
    const q = variables.q ?? '';
    const all =
      mode === 'empty'
        ? []
        : q.includes('is:issue')
        ? issueFixtures(now)
        : pullRequestFixtures(q.includes('review-requested') ? 'review' : 'authored', now, startedAt + LATE_PR_AFTER_MS);
    const start = Number(variables.cursor ?? 0);
    const nodes = all.slice(start, start + PAGE_SIZE);
    const next = start + PAGE_SIZE;
    return json({
      data: {
        search: {
          pageInfo: { hasNextPage: next < all.length, endCursor: next < all.length ? String(next) : null },
          nodes,
        },
      },
    });
  };
}
