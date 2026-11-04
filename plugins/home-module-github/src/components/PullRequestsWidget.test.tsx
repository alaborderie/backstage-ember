import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { identityApiRef, storageApiRef } from '@backstage/core-plugin-api';
import { mockApis, renderInTestApp } from '@backstage/frontend-test-utils';

type Storage = ReturnType<typeof mockApis.storage>;
import { githubHomeApiRef, type GithubHomeApi } from '../api/types';
import { pullRequest } from '../testing/fixtures';
import { PullRequestsWidget } from './PullRequestsWidget';

const USER = 'user:default/ada';

const authored = [
  pullRequest('garden-app', 1, {
    headRef: 'cloud-agent/5e7d9c1a2b3f',
    checks: 'failing',
  }),
  pullRequest('acme-api', 2, { isDraft: true }),
  pullRequest('garden-app', 3),
];

function api(): GithubHomeApi {
  return {
    getOpenIssues: jest.fn(),
    getPullRequests: jest.fn(async ({ scope }) =>
      scope === 'authored' ? authored : [],
    ),
  };
}

const render = (storage: Storage, githubHomeApi = api()) =>
  renderInTestApp(<PullRequestsWidget />, {
    apis: [
      [githubHomeApiRef, githubHomeApi],
      [storageApiRef, storage],
      [identityApiRef, mockApis.identity({ userEntityRef: USER })],
    ],
  });

const rows = () => screen.getAllByRole('listitem');

describe('PullRequestsWidget', () => {
  it('filters by project and keeps the selection for the next visit', async () => {
    const storage = mockApis.storage();
    const first = await render(storage);
    await waitFor(() => expect(rows()).toHaveLength(3));

    await userEvent.click(screen.getByRole('button', { name: /^garden-app/ }));
    expect(rows()).toHaveLength(2);
    expect(
      storage
        .forBucket('home.github')
        .forBucket(USER)
        .snapshot('pulls.projects').value,
    ).toEqual(['acme/garden-app']);
    first.unmount();

    await render(storage);
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.getByRole('button', { name: /^garden-app/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'All projects' }),
    ).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'All projects' }));
    expect(rows()).toHaveLength(3);
  });

  it('shows the agent tag, draft tag, check rollup and diff for each row', async () => {
    await render(mockApis.storage());
    await waitFor(() => expect(rows()).toHaveLength(3));
    const agentRow = rows()[0]!;
    expect(
      within(agentRow).getByRole('link', { name: /Agent that opened/ }),
    ).toHaveAttribute('href', '/cloud-agents/agents/ag_5e7d9c1a2b3f');
    expect(within(agentRow).getByText('Checks failing')).toBeInTheDocument();
    expect(
      within(agentRow).getByText('10 additions, 2 deletions'),
    ).toBeInTheDocument();
    expect(within(rows()[1]!).getByText('Draft')).toBeInTheDocument();
  });

  it('switches to review requests and explains the empty state', async () => {
    const githubHomeApi = api();
    await render(mockApis.storage(), githubHomeApi);
    await waitFor(() => expect(rows()).toHaveLength(3));
    await userEvent.click(
      screen.getByRole('radio', { name: 'Review requested' }),
    );
    expect(
      await screen.findByText('Nothing waiting on your review'),
    ).toBeInTheDocument();
    expect(githubHomeApi.getPullRequests).toHaveBeenCalledWith({
      scope: 'review-requested',
    });
  });
});
