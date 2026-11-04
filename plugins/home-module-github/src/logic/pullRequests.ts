import type { GithubPullRequest } from '../api/types';
import { AGENT_BRANCH_PREFIX } from '../api/GithubGraphqlClient';
import { repositoryKey } from './issues';

export interface ProjectChip {
  key: string;
  label: string;
  count: number;
}

/** One chip per repository with an open pull request, by count then name. */
export function projectChips(pullRequests: readonly GithubPullRequest[]): ProjectChip[] {
  const counts = new Map<string, ProjectChip>();
  for (const pr of pullRequests) {
    const key = repositoryKey(pr.repository);
    const chip = counts.get(key) ?? { key, label: pr.repository.name, count: 0 };
    chip.count += 1;
    counts.set(key, chip);
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/** An empty selection means every project. */
export function filterByProjects(
  pullRequests: readonly GithubPullRequest[],
  selected: readonly string[],
): GithubPullRequest[] {
  if (!selected.length) return [...pullRequests];
  const keys = new Set(selected);
  return pullRequests.filter(pr => keys.has(repositoryKey(pr.repository)));
}

export function toggleProject(selected: readonly string[], key: string | null): string[] {
  if (key === null) return [];
  return selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key];
}

/** The cloud-agents page of the agent that owns a `cloud-agent/<id>` branch. */
export function agentHref(pr: GithubPullRequest): string | undefined {
  if (!pr.headRef.startsWith(AGENT_BRANCH_PREFIX)) return undefined;
  const id = pr.headRef.slice(AGENT_BRANCH_PREFIX.length);
  return id ? `/cloud-agents/agents/ag_${encodeURIComponent(id)}` : undefined;
}

/** Widths of the two diff bar layers, as `scaleX` factors. */
export function diffScale(pr: Pick<GithubPullRequest, 'additions' | 'deletions'>) {
  const total = Math.max(pr.additions + pr.deletions, 1);
  return { additions: pr.additions / total, deletions: pr.deletions / total };
}
