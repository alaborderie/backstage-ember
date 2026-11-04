import type { RawIssue, RawPullRequest } from '../src/api/GithubGraphqlClient';

const DAY = 86_400_000;
const HOUR = 3_600_000;

type Lang = [string, string] | null;
const LANGS: Record<string, Lang> = {
  ts: ['TypeScript', '#3178c6'],
  go: ['Go', '#00ADD8'],
  js: ['JavaScript', '#f1e05a'],
  rust: ['Rust', '#dea584'],
  py: ['Python', '#3572A5'],
  swift: ['Swift', '#F05138'],
  hcl: ['HCL', '#844FBA'],
  cpp: ['C++', '#f34b7d'],
  kt: ['Kotlin', '#A97BFF'],
};

const LABELS: Record<string, string> = {
  bug: 'd73a4a',
  enhancement: 'a2eeef',
  'area/infra': '1d76db',
  'kind/chore': 'c5def5',
  'priority/high': 'd93f0b',
  'priority/medium': 'fbca04',
  docs: '0075ca',
  'good first issue': '7057ff',
  'on-hold': '7a7a7a',
  epic: '8a6cf0',
};

interface RepoFixture {
  name: string;
  lang: keyof typeof LANGS | null;
  isPrivate: boolean;
  /** Age of the most recent issue, in days. */
  freshDays: number;
  issues: { title: string; labels?: string[]; comments?: number; agent?: boolean }[];
}

/** Fictional repositories and issues for the dev app. None of this is real data. */
const REPOS: RepoFixture[] = [
  {
    name: 'garden-app',
    lang: 'ts',
    isPrivate: true,
    freshDays: 0.1,
    issues: [
      { title: 'Seed packets list jumps when a filter is cleared', labels: ['bug', 'priority/high'], comments: 3 },
      { title: 'Add a watering schedule view for each bed', labels: ['enhancement'], comments: 1, agent: true },
      { title: 'Offline mode: queue harvest logs and sync later', labels: ['enhancement', 'epic'] },
      { title: 'Frost alerts fire twice on daylight saving day', labels: ['bug'], comments: 2 },
      { title: 'Translate the onboarding tour into Spanish and German', labels: ['good first issue'] },
      { title: 'Compost tracker rounds weights to whole kilograms', labels: ['bug', 'priority/medium'] },
      { title: 'Move image uploads to signed URLs', labels: ['area/infra'] },
      { title: 'Plot editor loses focus after undo', labels: ['bug'] },
      { title: 'Export the season summary as PDF', labels: ['enhancement'] },
      { title: 'Dark mode contrast on the calendar legend', labels: ['bug', 'good first issue'] },
      { title: 'Upgrade the date library and drop the polyfill', labels: ['kind/chore'] },
      { title: 'Companion planting hints for tomatoes', labels: ['enhancement', 'on-hold'] },
    ],
  },
  {
    name: 'acme-api',
    lang: 'go',
    isPrivate: false,
    freshDays: 0.6,
    issues: [
      { title: 'Add a retry budget to the webhook dispatcher', labels: ['enhancement', 'area/infra'], comments: 4 },
      { title: 'Paginate GET /orders with an opaque cursor', labels: ['enhancement'], comments: 1, agent: true },
      { title: 'Rate limiter counts preflight requests', labels: ['bug'] },
      { title: 'Document the idempotency key header', labels: ['docs'] },
      { title: 'Return 422 instead of 500 on malformed JSON', labels: ['bug', 'priority/medium'], comments: 2 },
      { title: 'Rotate the signing key without downtime', labels: ['area/infra', 'priority/high'] },
      { title: 'Structured logs: add the request ID to every line', labels: ['kind/chore'] },
    ],
  },
  {
    name: 'lantern-docs',
    lang: 'js',
    isPrivate: false,
    freshDays: 3,
    issues: [
      { title: 'Search results ignore code blocks', labels: ['bug'] },
      { title: 'Add a page about local development', labels: ['docs', 'good first issue'], comments: 1 },
      { title: 'Broken anchor links after the heading rename', labels: ['bug'] },
    ],
  },
  {
    name: 'tidepool',
    lang: 'py',
    isPrivate: true,
    freshDays: 6,
    issues: [
      { title: 'Nightly import stalls on files over 2 GB', labels: ['bug', 'priority/high'], comments: 5 },
      { title: 'Swap the cron runner for a queue', labels: ['area/infra'] },
      { title: 'Tide chart smoothing looks jagged at low zoom', labels: ['bug'] },
      { title: 'Archive readings older than five years', labels: ['on-hold'] },
      { title: 'Second sensor vendor integration', labels: ['epic', 'on-hold'], comments: 2 },
    ],
  },
  {
    name: 'orbit-cli',
    lang: 'rust',
    isPrivate: false,
    freshDays: 9,
    issues: [
      { title: 'Shell completions for fish', labels: ['enhancement', 'good first issue'] },
      { title: 'Progress bar flickers in narrow terminals', labels: ['bug'] },
    ],
  },
  {
    name: 'quill-notes',
    lang: 'swift',
    isPrivate: true,
    freshDays: 14,
    issues: [
      { title: 'iPad split view loses the selected note', labels: ['bug'], comments: 1 },
      { title: 'Share sheet extension', labels: ['enhancement'] },
    ],
  },
  {
    name: 'harbor-infra',
    lang: 'hcl',
    isPrivate: true,
    freshDays: 4,
    issues: [
      { title: 'Move state to the new bucket', labels: ['area/infra', 'on-hold'] },
      { title: 'Tag every volume with its cost center', labels: ['kind/chore', 'on-hold'] },
      { title: 'Second region for the queue cluster', labels: ['epic', 'on-hold'] },
    ],
  },
  {
    name: 'pixel-forge',
    lang: 'cpp',
    isPrivate: false,
    freshDays: 41,
    issues: [
      { title: 'Shader cache grows without bound', labels: ['bug'] },
      { title: 'Vulkan backend crashes on resize', labels: ['bug', 'priority/medium'], comments: 2 },
      { title: 'Benchmarks for the tile renderer', labels: ['enhancement'] },
    ],
  },
  {
    name: 'paper-lantern',
    lang: 'kt',
    isPrivate: true,
    freshDays: 63,
    issues: [
      { title: 'Widget refresh drains the battery', labels: ['bug'] },
      { title: 'Material 3 color roles', labels: ['enhancement'] },
    ],
  },
  {
    name: 'moss-sync',
    lang: null,
    isPrivate: true,
    freshDays: 88,
    issues: [{ title: 'Decide on the conflict resolution strategy', labels: ['epic'], comments: 6 }],
  },
];

export const OWNER = 'acme';

function repository(name: string, lang: keyof typeof LANGS | null, isPrivate: boolean) {
  const language = lang ? LANGS[lang] : null;
  return {
    name,
    isPrivate,
    owner: { login: OWNER },
    primaryLanguage: language ? { name: language[0], color: language[1] } : null,
  };
}

export function issueFixtures(now: number): RawIssue[] {
  let number = 140;
  return REPOS.flatMap(repo =>
    repo.issues.map((issue, index) => {
      number -= 3;
      const updated = now - repo.freshDays * DAY - index * 1.7 * DAY - (index % 3) * HOUR;
      return {
        number,
        title: issue.title,
        url: `https://github.com/${OWNER}/${repo.name}/issues/${number}`,
        updatedAt: new Date(updated).toISOString(),
        comments: { totalCount: issue.comments ?? 0 },
        labels: {
          nodes: (issue.labels ?? []).map(name => ({ name, color: LABELS[name] ?? '958b89' })),
        },
        repository: repository(repo.name, repo.lang, repo.isPrivate),
        closedByPullRequestsReferences: {
          nodes: issue.agent ? [{ headRefName: 'cloud-agent/5e7d9c1a2b3f' }] : [],
        },
      };
    }),
  );
}

interface PrFixture {
  repo: string;
  lang: keyof typeof LANGS;
  isPrivate: boolean;
  number: number;
  title: string;
  head: string;
  draft?: boolean;
  checks: 'SUCCESS' | 'FAILURE' | 'PENDING' | null;
  additions: number;
  deletions: number;
  hoursAgo: number;
}

const AUTHORED: PrFixture[] = [
  { repo: 'acme-api', lang: 'go', isPrivate: false, number: 212, title: 'feat(api): paginate GET /orders with an opaque cursor', head: 'cloud-agent/5e7d9c1a2b3f', checks: 'PENDING', additions: 1284, deletions: 402, hoursAgo: 0.1 },
  { repo: 'garden-app', lang: 'ts', isPrivate: true, number: 87, title: 'feat: watering schedule view for each bed', head: 'cloud-agent/9b2e4f6a8c1d', checks: 'SUCCESS', additions: 38, deletions: 412, hoursAgo: 2 },
  { repo: 'lantern-docs', lang: 'js', isPrivate: false, number: 31, title: 'docs: local development guide', head: 'docs/local-dev', draft: true, checks: 'SUCCESS', additions: 146, deletions: 63, hoursAgo: 23 },
  { repo: 'garden-app', lang: 'ts', isPrivate: true, number: 85, title: 'fix: keep the seed list scroll position when filters change', head: 'fix/seed-scroll', checks: 'FAILURE', additions: 2031, deletions: 588, hoursAgo: 72 },
  { repo: 'tidepool', lang: 'py', isPrivate: true, number: 44, title: 'perf: stream the nightly import instead of buffering', head: 'perf/stream-import', checks: null, additions: 412, deletions: 20, hoursAgo: 96 },
];

const LATE_PR: PrFixture = { repo: 'orbit-cli', lang: 'rust', isPrivate: false, number: 58, title: 'feat: shell completions for fish', head: 'cloud-agent/7c4a2e9f0b6d', checks: 'PENDING', additions: 46, deletions: 9, hoursAgo: 0 };

const REVIEW: PrFixture[] = [
  { repo: 'acme-api', lang: 'go', isPrivate: false, number: 209, title: 'chore: structured logs with request IDs', head: 'chore/request-ids', checks: 'SUCCESS', additions: 220, deletions: 75, hoursAgo: 5 },
];

function pr(fixture: PrFixture, now: number): RawPullRequest {
  return {
    number: fixture.number,
    title: fixture.title,
    url: `https://github.com/${OWNER}/${fixture.repo}/pull/${fixture.number}`,
    updatedAt: new Date(now - fixture.hoursAgo * HOUR).toISOString(),
    isDraft: !!fixture.draft,
    headRefName: fixture.head,
    additions: fixture.additions,
    deletions: fixture.deletions,
    repository: repository(fixture.repo, fixture.lang, fixture.isPrivate),
    commits: {
      nodes: [{ commit: { statusCheckRollup: fixture.checks ? { state: fixture.checks } : null } }],
    },
  };
}

/** After `lateAt`, an agent has opened one more pull request. */
export function pullRequestFixtures(scope: 'authored' | 'review', now: number, lateAt: number): RawPullRequest[] {
  if (scope === 'review') return REVIEW.map(f => pr(f, now));
  const list = AUTHORED.map(f => pr(f, now));
  return now >= lateAt ? [pr({ ...LATE_PR, hoursAgo: (now - lateAt) / HOUR }, now), ...list] : list;
}
