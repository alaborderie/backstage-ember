import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarPage } from '@backstage/core-components';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import type { AppNode } from '@backstage/frontend-plugin-api';
import type {
  NavContentNavItem,
  NavContentNavItems,
} from '@backstage/plugin-app-react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { EmberNav } from './EmberNav';

function navItems(
  pages: [id: string, href: string, title: string][],
): NavContentNavItems {
  const all: NavContentNavItem[] = pages.map(([id, href, title]) => ({
    node: { spec: { id } } as AppNode,
    href,
    title,
    icon: <span />,
    routeRef: {} as NavContentNavItem['routeRef'],
  }));
  const make = (taken: Set<string>): NavContentNavItems => ({
    take: id => {
      const item = all.find(i => i.node.spec.id === id);
      if (item) taken.add(id);
      return item;
    },
    rest: () => all.filter(i => !taken.has(i.node.spec.id)),
    clone: () => make(new Set(taken)),
    withComponent: () => {
      throw new Error('not used');
    },
  });
  return make(new Set());
}

const pages: [string, string, string][] = [
  ['page:scaffolder', '/create', 'Create'],
  ['page:catalog', '/catalog', 'Catalog'],
  ['page:kubernetes', '/kubernetes', 'Kubernetes'],
  ['page:home', '/', 'Home'],
  ['page:cloud-agents', '/cloud-agents', 'Cloud agents'],
  ['page:api-docs', '/api-docs', 'APIs'],
  ['page:techdocs', '/docs', 'Docs'],
  ['page:user-settings', '/settings', 'Settings'],
  ['page:search', '/search', 'Search'],
];

function Nav() {
  const [items] = useState(() => navItems(pages));
  return <EmberNav navItems={items} items={[]} />;
}

function render(agents: () => Response) {
  return renderInTestApp(
    <SidebarPage>
      <Nav />
    </SidebarPage>,
    {
      apis: [
        [
          discoveryApiRef,
          { getBaseUrl: async (id: string) => `http://backstage/api/${id}` },
        ],
        [fetchApiRef, { fetch: async () => agents() }],
      ],
    },
  );
}

describe('EmberNav', () => {
  it('orders the pages as the design does and keeps settings out of the list', async () => {
    await render(() => new Response('[]'));
    await screen.findByRole('link', { name: /^Settings for / });
    const nav = screen.getByRole('navigation', { name: 'sidebar nav' });
    const titles = within(nav)
      .getAllByRole('link')
      .map(link => link.getAttribute('aria-label'));
    expect(titles).toEqual([
      'Home',
      'Home',
      'Catalog',
      'Cloud agents',
      'APIs',
      'Docs',
      'Create',
      'Kubernetes',
      expect.stringMatching(/^Settings for /),
    ]);
  });

  it('announces how many agents need the user', async () => {
    await render(
      () =>
        new Response(
          JSON.stringify([
            { status: 'needs_input' },
            { status: 'needs_input' },
          ]),
        ),
    );
    expect(
      await screen.findByRole('link', {
        name: 'Cloud agents, 2 agents need you',
      }),
    ).toBeInTheDocument();
  });

  it('collapses to the rail and back', async () => {
    await render(() => new Response('', { status: 404 }));
    await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Expand' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Collapse' }),
    ).toBeInTheDocument();
  });
});
