import { createApiRef } from '@backstage/frontend-plugin-api';

/** @public */
export interface GithubRepository {
  owner: string;
  name: string;
  isPrivate: boolean;
  language?: { name: string; color: string };
}

/** @public */
export interface GithubLabel {
  name: string;
  /** Six hex digits, without `#`, as GitHub returns it. */
  color: string;
}

/** @public */
export interface GithubIssue {
  repository: GithubRepository;
  number: number;
  title: string;
  url: string;
  labels: GithubLabel[];
  comments: number;
  updatedAt: string;
  /** An open pull request from a `cloud-agent/` branch closes this issue. */
  agentOnIt: boolean;
}

/** @public */
export type CheckRollup = 'passing' | 'failing' | 'running' | 'none';

/** @public */
export interface GithubPullRequest {
  repository: GithubRepository;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  headRef: string;
  additions: number;
  deletions: number;
  checks: CheckRollup;
  updatedAt: string;
}

/** @public */
export type PullRequestScope = 'authored' | 'review-requested';

/**
 * Data for the GitHub home widgets. The default implementation calls GitHub
 * GraphQL from the browser with the signed-in user's token. A backend can
 * replace it without changing the widgets.
 *
 * @public
 */
export interface GithubHomeApi {
  /** Open issues in repositories owned by `owner`, or by the signed-in user. */
  getOpenIssues(options: { owner?: string }): Promise<GithubIssue[]>;
  /** Open pull requests the signed-in user opened or must review. */
  getPullRequests(options: { scope: PullRequestScope }): Promise<GithubPullRequest[]>;
}

/** @public */
export const githubHomeApiRef = createApiRef<GithubHomeApi>({
  id: 'plugin.home.github',
});
