import { screen, waitFor } from '@testing-library/react';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { countNeedsInput, useNeedsYouCount } from './useNeedsYouCount';

function Probe() {
  const count = useNeedsYouCount();
  return <span>{count === undefined ? 'none' : `count ${count}`}</span>;
}

const discovery = {
  getBaseUrl: async (id: string) => `http://backstage/api/${id}`,
};

function render(response: () => Promise<Response>) {
  const fetch = jest.fn(response);
  renderInTestApp(<Probe />, {
    apis: [
      [discoveryApiRef, discovery],
      [fetchApiRef, { fetch }],
    ],
  });
  return fetch;
}

describe('countNeedsInput', () => {
  it('counts agents waiting for input in a list or an items envelope', () => {
    expect(
      countNeedsInput([{ status: 'needs_input' }, { status: 'needs_input' }]),
    ).toBe(2);
    expect(
      countNeedsInput([{ status: 'running' }, { status: 'needs_input' }]),
    ).toBe(1);
    expect(countNeedsInput({ items: [{ status: 'needs_input' }] })).toBe(1);
    expect(countNeedsInput({ error: 'nope' })).toBeUndefined();
  });
});

describe('useNeedsYouCount', () => {
  it('reads the needs_input agents from the cloud-agents backend', async () => {
    const fetch = render(
      async () => new Response(JSON.stringify([{ status: 'needs_input' }])),
    );
    expect(await screen.findByText('count 1')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      'http://backstage/api/cloud-agents/agents?status=needs_input',
    );
  });

  it('shows nothing when the backend is missing', async () => {
    const fetch = render(async () => new Response('', { status: 404 }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('shows nothing when the call fails', async () => {
    const fetch = render(async () => {
      throw new Error('offline');
    });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
