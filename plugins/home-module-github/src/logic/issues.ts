import type { GithubIssue, GithubRepository } from '../api/types';

export const ROWS_PER_GROUP = 5;
export const QUIET_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

export interface IssueGroup {
  key: string;
  repository: GithubRepository;
  /** Matching issues, most recently updated first. */
  issues: GithubIssue[];
  /** Most recent activity among the group's visible issues. */
  updatedAt: string;
}

export interface IssueGrouping {
  active: IssueGroup[];
  quiet: IssueGroup[];
  /** Issues shown across all groups. */
  total: number;
  /** Issues the hidden labels removed. */
  hiddenCount: number;
}

export interface IssueGroupingOptions {
  hideLabeled: boolean;
  hiddenLabels: readonly string[];
  query: string;
  now: number;
}

export const repositoryKey = (repository: GithubRepository) =>
  `${repository.owner}/${repository.name}`;

export function hasHiddenLabel(
  issue: GithubIssue,
  hiddenLabels: readonly string[],
): boolean {
  const hidden = new Set(hiddenLabels.map(label => label.toLowerCase()));
  return issue.labels.some(label => hidden.has(label.name.toLowerCase()));
}

export function matchesQuery(issue: GithubIssue, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const number = q.replace(/^#/, '');
  return (
    issue.title.toLowerCase().includes(q) || String(issue.number) === number
  );
}

/**
 * Groups open issues by repository, most recently active first. Without a
 * text query, repositories with no activity for 30 days fold into `quiet`.
 */
export function groupIssues(
  issues: readonly GithubIssue[],
  { hideLabeled, hiddenLabels, query, now }: IssueGroupingOptions,
): IssueGrouping {
  const hiddenCount = issues.filter(issue =>
    hasHiddenLabel(issue, hiddenLabels),
  ).length;
  const visible = issues.filter(
    issue =>
      (!hideLabeled || !hasHiddenLabel(issue, hiddenLabels)) &&
      matchesQuery(issue, query),
  );

  const groups = new Map<string, IssueGroup>();
  for (const issue of visible) {
    const key = repositoryKey(issue.repository);
    const group = groups.get(key);
    if (group) {
      group.issues.push(issue);
      if (issue.updatedAt > group.updatedAt) group.updatedAt = issue.updatedAt;
    } else {
      groups.set(key, {
        key,
        repository: issue.repository,
        issues: [issue],
        updatedAt: issue.updatedAt,
      });
    }
  }

  const sorted = [...groups.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  for (const group of sorted) {
    group.issues.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const isQuiet = (group: IssueGroup) =>
    !query.trim() &&
    now - Date.parse(group.updatedAt) > QUIET_AFTER_DAYS * DAY_MS;

  return {
    active: sorted.filter(group => !isQuiet(group)),
    quiet: sorted.filter(isQuiet),
    total: visible.length,
    hiddenCount,
  };
}

/** The two most recently active groups open on first load. */
export function defaultExpanded(grouping: IssueGrouping): string[] {
  return grouping.active.slice(0, 2).map(group => group.key);
}

/** Deep link that hands an issue to a new cloud agent. */
export function handToAgentHref(issue: GithubIssue): string {
  const params = new URLSearchParams({
    repo: repositoryKey(issue.repository),
    issue: String(issue.number),
    title: issue.title,
  });
  return `/cloud-agents/new?${params.toString().replace(/\+/g, '%20')}`;
}
