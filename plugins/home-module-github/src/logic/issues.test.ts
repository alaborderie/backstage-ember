import { defaultExpanded, groupIssues, handToAgentHref } from './issues';
import { issue, NOW, onHold } from '../testing/fixtures';

const options = {
  hideLabeled: true,
  hiddenLabels: ['on-hold'],
  query: '',
  now: NOW,
};

describe('groupIssues', () => {
  const issues = [
    issue('garden-app', 2, { title: 'Frost alerts fire twice' }),
    issue('acme-api', 0.5),
    issue('garden-app', 1),
    issue('acme-api', 4, { labels: [onHold] }),
    issue('harbor-infra', 1, {
      labels: [{ name: 'On-Hold', color: '000000' }],
    }),
    issue('pixel-forge', 41),
    issue('moss-sync', 88),
  ];

  it('groups by repository, most recently active first, with issues newest first', () => {
    const { active } = groupIssues(issues, options);
    expect(active.map(g => g.key)).toEqual([
      'acme/acme-api',
      'acme/garden-app',
    ]);
    const garden = active[1]!;
    expect(garden.issues.map(i => i.updatedAt)).toEqual(
      [...garden.issues.map(i => i.updatedAt)].sort().reverse(),
    );
  });

  it('folds repositories with no activity for 30 days into quiet', () => {
    const { quiet, total } = groupIssues(issues, options);
    expect(quiet.map(g => g.repository.name)).toEqual([
      'pixel-forge',
      'moss-sync',
    ]);
    expect(total).toBe(5);
  });

  it('hides issues with a hidden label, case-insensitively, and counts them', () => {
    const hidden = groupIssues(issues, options);
    expect(hidden.hiddenCount).toBe(2);
    expect(
      hidden.active.find(g => g.repository.name === 'harbor-infra'),
    ).toBeUndefined();

    const shown = groupIssues(issues, { ...options, hideLabeled: false });
    expect(shown.total).toBe(7);
    expect(shown.active.map(g => g.repository.name)).toContain('harbor-infra');
  });

  it('matches the text filter on titles and #numbers, without folding quiet groups', () => {
    expect(groupIssues(issues, { ...options, query: 'frost' }).total).toBe(1);
    const byNumber = groupIssues(issues, {
      ...options,
      query: `#${issues[5]!.number}`,
    });
    expect(byNumber.active.map(g => g.repository.name)).toEqual([
      'pixel-forge',
    ]);
    expect(byNumber.quiet).toEqual([]);
  });

  it('opens the two most recently active groups by default', () => {
    const many = [issue('a', 1), issue('b', 2), issue('c', 3)];
    expect(defaultExpanded(groupIssues(many, options))).toEqual([
      'acme/a',
      'acme/b',
    ]);
  });
});

describe('handToAgentHref', () => {
  it('builds the cloud-agents deep link with the repository, number and encoded title', () => {
    const href = handToAgentHref(
      issue('garden-app', 1, {
        number: 42,
        title: 'Fix the frost & dew alerts',
      }),
    );
    expect(href).toBe(
      '/cloud-agents/new?repo=acme%2Fgarden-app&issue=42&title=Fix%20the%20frost%20%26%20dew%20alerts',
    );
    const params = new URL(href, 'http://x').searchParams;
    expect(params.get('repo')).toBe('acme/garden-app');
    expect(params.get('title')).toBe('Fix the frost & dew alerts');
  });
});
