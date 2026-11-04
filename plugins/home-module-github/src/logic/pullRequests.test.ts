import {
  agentHref,
  diffScale,
  filterByProjects,
  projectChips,
  toggleProject,
} from './pullRequests';
import { pullRequest } from '../testing/fixtures';

const prs = [
  pullRequest('garden-app', 1),
  pullRequest('acme-api', 2),
  pullRequest('garden-app', 3),
];

describe('pull request filters', () => {
  it('offers one chip per repository, by count then name', () => {
    expect(projectChips(prs)).toEqual([
      { key: 'acme/garden-app', label: 'garden-app', count: 2 },
      { key: 'acme/acme-api', label: 'acme-api', count: 1 },
    ]);
  });

  it('keeps every pull request when no project is selected', () => {
    expect(filterByProjects(prs, [])).toHaveLength(3);
    expect(filterByProjects(prs, ['acme/acme-api']).map(p => p.number)).toEqual(
      [2],
    );
  });

  it('toggles a project, and the All chip clears the selection', () => {
    expect(toggleProject([], 'acme/a')).toEqual(['acme/a']);
    expect(toggleProject(['acme/a', 'acme/b'], 'acme/a')).toEqual(['acme/b']);
    expect(toggleProject(['acme/a'], null)).toEqual([]);
  });

  it('links agent branches to their agent', () => {
    expect(
      agentHref(pullRequest('a', 1, { headRef: 'cloud-agent/5e7d9c1a2b3f' })),
    ).toBe('/cloud-agents/agents/ag_5e7d9c1a2b3f');
    expect(
      agentHref(pullRequest('a', 1, { headRef: 'feat/x' })),
    ).toBeUndefined();
  });

  it('splits the diff bar by share of changed lines', () => {
    expect(diffScale({ additions: 3, deletions: 1 })).toEqual({
      additions: 0.75,
      deletions: 0.25,
    });
    expect(diffScale({ additions: 0, deletions: 0 })).toEqual({
      additions: 0,
      deletions: 0,
    });
  });
});
