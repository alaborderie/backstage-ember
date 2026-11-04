import type {
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
} from '../api/types';

export const NOW = Date.parse('2026-11-04T20:30:00Z');
const DAY = 86_400_000;

export const repo = (
  name: string,
  extra: Partial<GithubRepository> = {},
): GithubRepository => ({
  owner: 'acme',
  name,
  isPrivate: false,
  ...extra,
});

let next = 1;
export function issue(
  repository: string,
  daysAgo: number,
  extra: Partial<GithubIssue> = {},
): GithubIssue {
  const number = next++;
  return {
    repository: repo(repository),
    number,
    title: `Fictional issue ${number}`,
    url: `https://github.com/acme/${repository}/issues/${number}`,
    labels: [],
    comments: 0,
    updatedAt: new Date(NOW - daysAgo * DAY).toISOString(),
    agentOnIt: false,
    ...extra,
  };
}

export function pullRequest(
  repository: string,
  number: number,
  extra: Partial<GithubPullRequest> = {},
): GithubPullRequest {
  return {
    repository: repo(repository),
    number,
    title: `Fictional change ${number}`,
    url: `https://github.com/acme/${repository}/pull/${number}`,
    isDraft: false,
    headRef: `feat/change-${number}`,
    additions: 10,
    deletions: 2,
    checks: 'passing',
    updatedAt: new Date(NOW - DAY).toISOString(),
    ...extra,
  };
}

export const onHold = { name: 'on-hold', color: '7a7a7a' };
