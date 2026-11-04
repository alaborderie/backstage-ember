import type {
  CheckRollup,
  GithubHomeApi,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
  PullRequestScope,
} from './types';
import { GithubHomeError, rateLimitResetAt } from './errors';

const REPOSITORY_FIELDS = `repository { name isPrivate owner { login } primaryLanguage { name color } }`;

const ISSUE_FIELDS = `... on Issue {
  number title url updatedAt
  comments { totalCount }
  labels(first: 10) { nodes { name color } }
  ${REPOSITORY_FIELDS}
  closedByPullRequestsReferences(first: 5, includeClosedPrs: false) { nodes { headRefName } }
}`;

const PULL_REQUEST_FIELDS = `... on PullRequest {
  number title url updatedAt isDraft headRefName additions deletions
  ${REPOSITORY_FIELDS}
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

const searchQuery = (fields: string) => `query($q: String!, $cursor: String) {
  search(type: ISSUE, query: $q, first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { ${fields} }
  }
}`;

/** The branch prefix the cloud-agents plugin gives agent branches. */
export const AGENT_BRANCH_PREFIX = 'cloud-agent/';

export const SEARCHES = {
  issues: (owner: string) => `is:open is:issue archived:false user:${owner}`,
  authored: 'is:open is:pr author:@me archived:false',
  'review-requested': 'is:open is:pr review-requested:@me archived:false',
} as const;

interface RawRepository {
  name: string;
  isPrivate: boolean;
  owner: { login: string };
  primaryLanguage: { name: string; color: string | null } | null;
}

export interface RawIssue {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  comments: { totalCount: number };
  labels: { nodes: { name: string; color: string }[] } | null;
  repository: RawRepository;
  closedByPullRequestsReferences: { nodes: { headRefName: string }[] } | null;
}

export interface RawPullRequest {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  isDraft: boolean;
  headRefName: string;
  additions: number;
  deletions: number;
  repository: RawRepository;
  commits: {
    nodes: { commit: { statusCheckRollup: { state: string } | null } }[];
  } | null;
}

interface SearchPage<T> {
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: (T | Record<string, never> | null)[];
  };
}

function toRepository(raw: RawRepository): GithubRepository {
  const repository: GithubRepository = {
    owner: raw.owner.login,
    name: raw.name,
    isPrivate: raw.isPrivate,
  };
  if (raw.primaryLanguage) {
    repository.language = {
      name: raw.primaryLanguage.name,
      color: raw.primaryLanguage.color ?? '#958B89',
    };
  }
  return repository;
}

export function toIssue(raw: RawIssue): GithubIssue {
  return {
    repository: toRepository(raw.repository),
    number: raw.number,
    title: raw.title,
    url: raw.url,
    labels: raw.labels?.nodes ?? [],
    comments: raw.comments.totalCount,
    updatedAt: raw.updatedAt,
    agentOnIt: (raw.closedByPullRequestsReferences?.nodes ?? []).some(pr =>
      pr.headRefName.startsWith(AGENT_BRANCH_PREFIX),
    ),
  };
}

const ROLLUP: Record<string, CheckRollup> = {
  SUCCESS: 'passing',
  FAILURE: 'failing',
  ERROR: 'failing',
  PENDING: 'running',
  EXPECTED: 'running',
};

export function toPullRequest(raw: RawPullRequest): GithubPullRequest {
  const state = raw.commits?.nodes[0]?.commit.statusCheckRollup?.state;
  return {
    repository: toRepository(raw.repository),
    number: raw.number,
    title: raw.title,
    url: raw.url,
    isDraft: raw.isDraft,
    headRef: raw.headRefName,
    additions: raw.additions,
    deletions: raw.deletions,
    checks: (state && ROLLUP[state]) || 'none',
    updatedAt: raw.updatedAt,
  };
}

/** @public */
export interface GithubGraphqlClientOptions {
  /** The signed-in user's GitHub token source, usually `githubAuthApiRef`. */
  auth: {
    getAccessToken(
      scope?: string[],
      options?: { optional?: boolean },
    ): Promise<string>;
  };
  /** Extra OAuth scopes. A GitHub App ignores scopes, so the default is none. */
  scopes?: string[];
  /** Defaults to `https://api.github.com/graphql`. */
  endpoint?: string;
  fetch?: typeof fetch;
  /** Stops paginating after this many pages of 100; search returns at most 1,000. */
  maxPages?: number;
  now?: () => number;
}

/**
 * The default {@link GithubHomeApi}: one GraphQL search per widget,
 * paginated, with concurrent identical calls sharing one request.
 *
 * @public
 */
export class GithubGraphqlClient implements GithubHomeApi {
  private readonly options: Required<
    Omit<GithubGraphqlClientOptions, 'fetch'>
  > & {
    fetch: typeof fetch;
  };
  private readonly inflight = new Map<string, Promise<unknown>>();
  private viewer?: Promise<string>;

  constructor(options: GithubGraphqlClientOptions) {
    this.options = {
      auth: options.auth,
      scopes: options.scopes ?? [],
      endpoint: options.endpoint ?? 'https://api.github.com/graphql',
      fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
      maxPages: options.maxPages ?? 10,
      now: options.now ?? Date.now,
    };
  }

  getOpenIssues({ owner }: { owner?: string }): Promise<GithubIssue[]> {
    return this.shared(`issues:${owner ?? '@viewer'}`, async () => {
      const login = owner || (await this.viewerLogin());
      const nodes = await this.search<RawIssue>(
        searchQuery(ISSUE_FIELDS),
        SEARCHES.issues(login),
      );
      return nodes.map(toIssue);
    });
  }

  getPullRequests({
    scope,
  }: {
    scope: PullRequestScope;
  }): Promise<GithubPullRequest[]> {
    return this.shared(`pulls:${scope}`, async () => {
      const nodes = await this.search<RawPullRequest>(
        searchQuery(PULL_REQUEST_FIELDS),
        SEARCHES[scope],
      );
      return nodes.map(toPullRequest);
    });
  }

  private shared<T>(key: string, run: () => Promise<T>): Promise<T> {
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;
    const promise = run().finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  private viewerLogin(): Promise<string> {
    this.viewer ??= this.graphql<{ viewer: { login: string } }>(
      'query { viewer { login } }',
      {},
    )
      .then(data => data.viewer.login)
      .catch(error => {
        this.viewer = undefined;
        throw error;
      });
    return this.viewer;
  }

  private async search<T>(query: string, q: string): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < this.options.maxPages; page++) {
      const data: SearchPage<T> = await this.graphql<SearchPage<T>>(query, {
        q,
        cursor,
      });
      for (const node of data.search.nodes) {
        if (node && typeof node === 'object' && 'number' in node)
          items.push(node as T);
      }
      if (!data.search.pageInfo.hasNextPage) break;
      cursor = data.search.pageInfo.endCursor;
    }
    return items;
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const token = await this.options.auth.getAccessToken(this.options.scopes, {
      optional: true,
    });
    if (!token) {
      throw new GithubHomeError(
        { kind: 'unauthorized', status: 0 },
        'There is no GitHub session',
      );
    }
    let response: Response;
    try {
      response = await this.options.fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new GithubHomeError(
        { kind: 'unavailable', detail: 'Network error' },
        `GitHub is unreachable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const now = this.options.now();
    if (response.status === 401) {
      throw new GithubHomeError(
        { kind: 'unauthorized', status: 401 },
        'GitHub rejected the session token',
      );
    }
    if (response.status === 403 || response.status === 429) {
      const text = await response.text().catch(() => '');
      const limited =
        response.status === 429 ||
        response.headers.get('x-ratelimit-remaining') === '0' ||
        /rate limit/i.test(text);
      const resetAt = rateLimitResetAt(response.headers, now);
      throw limited
        ? new GithubHomeError(
            {
              kind: 'rate-limited',
              status: response.status,
              ...(resetAt ? { resetAt } : {}),
            },
            `${response.status} rate limit exceeded`,
          )
        : new GithubHomeError(
            { kind: 'unauthorized', status: 403 },
            '403 GitHub refused access',
          );
    }
    if (!response.ok) {
      throw new GithubHomeError(
        {
          kind: 'unavailable',
          status: response.status,
          detail: `${response.status} ${response.statusText}`.trim(),
        },
        `GitHub answered ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      data?: T;
      errors?: { type?: string; message: string }[];
    };
    const errors = body.errors ?? [];
    if (errors.some(error => error.type === 'RATE_LIMITED')) {
      const resetAt = rateLimitResetAt(response.headers, now);
      throw new GithubHomeError(
        {
          kind: 'rate-limited',
          status: response.status,
          ...(resetAt ? { resetAt } : {}),
        },
        'GraphQL rate limit exceeded',
      );
    }
    if (!body.data) {
      const detail = errors[0]?.message ?? 'Empty response';
      throw new GithubHomeError({ kind: 'unavailable', detail }, detail);
    }
    return body.data;
  }
}
