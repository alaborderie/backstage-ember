import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { identityApiRef, storageApiRef } from '@backstage/core-plugin-api';
import { mockApis, renderInTestApp } from '@backstage/frontend-test-utils';
import { githubHomeApiRef, type GithubHomeApi } from '../api/types';
import { GithubHomeError } from '../api/errors';
import { issue, onHold } from '../testing/fixtures';
import { IssuesWidget } from './IssuesWidget';

const USER = 'user:default/ada';

const DAY = 86_400_000;
const ago = (days: number) =>
  (Date.now() - Date.parse('2026-11-04T20:30:00Z')) / DAY + days;

const issues = () => [
  ...Array.from({ length: 7 }, (_, i) => issue('garden-app', ago(1 + i * 0.1))),
  issue('acme-api', ago(2)),
  issue('acme-api', ago(3), { labels: [onHold] }),
  issue('pixel-forge', ago(45)),
];

const render = (
  getOpenIssues: GithubHomeApi['getOpenIssues'],
  storage = mockApis.storage(),
) =>
  renderInTestApp(<IssuesWidget owner="acme" hiddenLabels={['on-hold']} />, {
    apis: [
      [githubHomeApiRef, { getOpenIssues, getPullRequests: jest.fn() }],
      [storageApiRef, storage],
      [identityApiRef, mockApis.identity({ userEntityRef: USER })],
    ],
  });

describe('IssuesWidget', () => {
  it('groups by repository, caps rows at five, folds quiet projects and hides on-hold issues', async () => {
    await render(jest.fn(async () => issues()));
    const garden = await screen.findByRole('button', { name: /garden-app/ });
    expect(garden).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('link', { name: /Hand issue/ })).toHaveLength(
      5 + 1,
    );
    expect(
      screen.getByRole('link', { name: '2 more in garden-app' }),
    ).toHaveAttribute('href', 'https://github.com/acme/garden-app/issues');

    const quiet = screen.getByRole('button', { name: /1 quiet project/ });
    expect(quiet).toHaveTextContent('no activity in 30 days · 1 issue');
    expect(
      screen.queryByRole('button', { name: /pixel-forge/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(quiet);
    expect(
      screen.getByRole('button', { name: /pixel-forge/ }),
    ).toBeInTheDocument();

    const hold = screen.getByRole('button', { name: /Hide on hold/ });
    expect(hold).toHaveAttribute('aria-pressed', 'true');
    expect(hold).toHaveTextContent('1');
    expect(screen.getByLabelText('9 open')).toBeInTheDocument();
    await userEvent.click(hold);
    expect(screen.getByLabelText('10 open')).toBeInTheDocument();
  });

  it('shows the rate limit error with its reset time when nothing is cached', async () => {
    const resetAt = Date.now() + 11 * 60_000;
    await render(
      jest.fn(async () => {
        throw new GithubHomeError(
          { kind: 'rate-limited', status: 403, resetAt },
          'limited',
        );
      }),
    );
    expect(
      await screen.findByText('GitHub did not answer'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '403 rate limit exceeded. It resets in 11 minutes.',
    );
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });

  it('keeps cached issues on screen when a refresh hits the rate limit', async () => {
    const storage = mockApis.storage();
    await storage
      .forBucket('home.github')
      .forBucket(USER)
      .set('issues:acme', {
        items: issues(),
        fetchedAt: Date.now() - 2 * 3_600_000,
      } as never);
    await render(
      jest.fn(async () => {
        throw new GithubHomeError(
          { kind: 'rate-limited', status: 429 },
          'limited',
        );
      }),
      storage,
    );
    expect(await screen.findByText('Rate limited')).toBeInTheDocument();
    expect(screen.getByText('· cached 2h ago')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /garden-app/ }),
    ).toBeInTheDocument();
  });

  it("never shows another user's cached issues", async () => {
    const storage = mockApis.storage();
    await storage
      .forBucket('home.github')
      .forBucket('user:default/someone-else')
      .set('issues:acme', { items: issues(), fetchedAt: Date.now() } as never);
    await render(
      jest.fn(async () => {
        throw new GithubHomeError(
          { kind: 'rate-limited', status: 429 },
          'limited',
        );
      }),
      storage,
    );
    expect(
      await screen.findByText('GitHub did not answer'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /garden-app/ }),
    ).not.toBeInTheDocument();
  });

  it('says so when nothing is open', async () => {
    await render(jest.fn(async () => []));
    expect(await screen.findByText('No open issues')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('0 open')).toBeInTheDocument(),
    );
  });
});
