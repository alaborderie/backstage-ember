import { GithubGraphqlClient, type RawIssue } from './GithubGraphqlClient';
import { GithubHomeError } from './errors';

const NOW = Date.parse('2026-11-04T20:30:00Z');

function rawIssue(number: number, headRefs: string[] = []): RawIssue {
  return {
    number,
    title: `Fictional issue ${number}`,
    url: `https://github.com/acme/garden-app/issues/${number}`,
    updatedAt: '2026-11-01T10:00:00Z',
    comments: { totalCount: 2 },
    labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] },
    repository: {
      name: 'garden-app',
      isPrivate: true,
      owner: { login: 'acme' },
      primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
    },
    closedByPullRequestsReferences: {
      nodes: headRefs.map(headRefName => ({ headRefName })),
    },
  };
}

const page = (nodes: unknown[], endCursor: string | null) =>
  new Response(
    JSON.stringify({
      data: {
        search: { pageInfo: { hasNextPage: !!endCursor, endCursor }, nodes },
      },
    }),
    { status: 200 },
  );

function setup(responses: (() => Response)[]) {
  const calls: {
    query: string;
    variables: Record<string, unknown>;
    auth: string | null;
  }[] = [];
  const fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({
      ...body,
      auth: new Headers(init?.headers).get('authorization'),
    });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    return next();
  });
  const auth = { getAccessToken: jest.fn(async () => 'token-123') };
  const client = new GithubGraphqlClient({ auth, fetch, now: () => NOW });
  return { client, calls, fetch, auth };
}

describe('GithubGraphqlClient', () => {
  it('follows search pages until GitHub reports no next page', async () => {
    const { client, calls } = setup([
      () => page([rawIssue(1), rawIssue(2)], 'cursor-1'),
      () => page([rawIssue(3), {}], null),
    ]);
    const issues = await client.getOpenIssues({ owner: 'acme' });

    expect(issues.map(i => i.number)).toEqual([1, 2, 3]);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.variables).toEqual({
      q: 'is:open is:issue archived:false user:acme',
      cursor: null,
    });
    expect(calls[1]!.variables.cursor).toBe('cursor-1');
    expect(calls[0]!.auth).toBe('Bearer token-123');
    expect(issues[0]).toMatchObject({
      repository: {
        owner: 'acme',
        name: 'garden-app',
        isPrivate: true,
        language: { name: 'TypeScript' },
      },
      labels: [{ name: 'bug', color: 'd73a4a' }],
      comments: 2,
      agentOnIt: false,
    });
  });

  it('stops at the page cap', async () => {
    const responses = Array.from(
      { length: 5 },
      (_, i) => () => page([rawIssue(i)], `c${i}`),
    );
    const fetch = jest.fn(async () => responses.shift()!());
    const client = new GithubGraphqlClient({
      auth: { getAccessToken: async () => 't' },
      fetch,
      maxPages: 3,
    });
    expect(await client.getOpenIssues({ owner: 'acme' })).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('marks an issue that an agent branch will close', async () => {
    const { client } = setup([
      () => page([rawIssue(7, ['cloud-agent/5e7d9c1a2b3f'])], null),
    ]);
    const [issue] = await client.getOpenIssues({ owner: 'acme' });
    expect(issue!.agentOnIt).toBe(true);
  });

  it('shares one request between concurrent identical calls', async () => {
    const { client, fetch } = setup([() => page([rawIssue(1)], null)]);
    const [a, b] = await Promise.all([
      client.getOpenIssues({ owner: 'acme' }),
      client.getOpenIssues({ owner: 'acme' }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('asks GitHub for the viewer login when no owner is configured', async () => {
    const { client, calls } = setup([
      () =>
        new Response(JSON.stringify({ data: { viewer: { login: 'octo' } } })),
      () => page([], null),
    ]);
    await client.getOpenIssues({});
    expect(calls[1]!.variables.q).toBe(
      'is:open is:issue archived:false user:octo',
    );
  });

  it('maps pull request check rollups and drafts', async () => {
    const pr = (number: number, state: string | null) => ({
      number,
      title: 't',
      url: 'u',
      updatedAt: '2026-11-01T10:00:00Z',
      isDraft: number === 3,
      headRefName: 'cloud-agent/abc',
      additions: 5,
      deletions: 1,
      repository: rawIssue(1).repository,
      commits: {
        nodes: [{ commit: { statusCheckRollup: state ? { state } : null } }],
      },
    });
    const { client, calls } = setup([
      () =>
        page(
          [pr(1, 'SUCCESS'), pr(2, 'ERROR'), pr(3, 'PENDING'), pr(4, null)],
          null,
        ),
    ]);
    const prs = await client.getPullRequests({ scope: 'review-requested' });
    expect(calls[0]!.variables.q).toBe(
      'is:open is:pr review-requested:@me archived:false',
    );
    expect(prs.map(p => p.checks)).toEqual([
      'passing',
      'failing',
      'running',
      'none',
    ]);
    expect(prs.map(p => p.isDraft)).toEqual([false, false, true, false]);
  });

  describe('rate limits and auth failures', () => {
    const fail = async (response: Response) => {
      const { client } = setup([() => response]);
      return client.getOpenIssues({ owner: 'acme' }).then(
        () => {
          throw new Error('expected a failure');
        },
        (error: unknown) => error as GithubHomeError,
      );
    };

    it('reports a 403 rate limit with the reset time from x-ratelimit-reset', async () => {
      const resetSeconds = Math.floor(NOW / 1000) + 660;
      const error = await fail(
        new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(resetSeconds),
          },
        }),
      );
      expect(error).toBeInstanceOf(GithubHomeError);
      expect(error.failure).toEqual({
        kind: 'rate-limited',
        status: 403,
        resetAt: resetSeconds * 1000,
      });
    });

    it('reports a 429 with the reset time from retry-after', async () => {
      const error = await fail(
        new Response('', { status: 429, headers: { 'retry-after': '90' } }),
      );
      expect(error.failure).toEqual({
        kind: 'rate-limited',
        status: 429,
        resetAt: NOW + 90_000,
      });
    });

    it('reports a secondary rate limit from the 403 message alone', async () => {
      const error = await fail(
        new Response(
          JSON.stringify({
            message: 'You have exceeded a secondary rate limit.',
          }),
          { status: 403 },
        ),
      );
      expect(error.failure).toEqual({ kind: 'rate-limited', status: 403 });
    });

    it('treats any other 403, and a 401, as an expired session', async () => {
      expect(
        (await fail(new Response('{}', { status: 403 }))).failure.kind,
      ).toBe('unauthorized');
      expect(
        (await fail(new Response('{}', { status: 401 }))).failure.kind,
      ).toBe('unauthorized');
    });

    it('reports a GraphQL RATE_LIMITED error returned with status 200', async () => {
      const error = await fail(
        new Response(
          JSON.stringify({
            errors: [{ type: 'RATE_LIMITED', message: 'limit' }],
          }),
          {
            status: 200,
            headers: { 'x-ratelimit-reset': '1800000000' },
          },
        ),
      );
      expect(error.failure).toEqual({
        kind: 'rate-limited',
        status: 200,
        resetAt: 1_800_000_000_000,
      });
    });

    it('reports a missing GitHub session without prompting for sign-in', async () => {
      const getAccessToken = jest.fn(async () => '');
      const fetch = jest.fn();
      const client = new GithubGraphqlClient({
        auth: { getAccessToken },
        fetch,
      });
      const error: unknown = await client
        .getOpenIssues({ owner: 'acme' })
        .catch(e => e);
      expect((error as GithubHomeError).failure).toEqual({
        kind: 'unauthorized',
        status: 0,
      });
      expect(getAccessToken).toHaveBeenCalledWith([], { optional: true });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('signs in with the configured scopes', async () => {
      const getAccessToken = jest.fn(async () => 'token');
      const client = new GithubGraphqlClient({
        auth: { getAccessToken },
        scopes: ['repo'],
      });
      await client.signIn();
      expect(getAccessToken).toHaveBeenCalledWith(['repo'], {
        instantPopup: true,
      });
    });

    it('reports server errors as unavailable', async () => {
      const error = await fail(
        new Response('', { status: 502, statusText: 'Bad Gateway' }),
      );
      expect(error.failure).toEqual({
        kind: 'unavailable',
        status: 502,
        detail: '502 Bad Gateway',
      });
    });

    it('releases a failed request so the next call retries', async () => {
      const { client, fetch } = setup([
        () => new Response('', { status: 502 }),
        () => page([rawIssue(1)], null),
      ]);
      await expect(
        client.getOpenIssues({ owner: 'acme' }),
      ).rejects.toBeInstanceOf(GithubHomeError);
      await expect(
        client.getOpenIssues({ owner: 'acme' }),
      ).resolves.toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
