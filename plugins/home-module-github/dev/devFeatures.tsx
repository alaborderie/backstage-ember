import {
  ApiBlueprint,
  createFrontendModule,
  createFrontendPlugin,
  createRouteRef,
  fetchApiRef,
  githubAuthApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { Content, Header, Page } from '@backstage/core-components';
import { Puzzle } from 'lucide-react';

const stub = (pluginId: string, path: string, title: string) =>
  createFrontendPlugin({
    pluginId,
    extensions: [
      PageBlueprint.make({
        params: {
          path,
          title,
          icon: <Puzzle size={18} strokeWidth={1.75} />,
          routeRef: createRouteRef(),
          noHeader: true,
          loader: async () => (
            <Page themeId="tool">
              <Header
                title={title}
                subtitle="A fictional page in the dev app."
              />
              <Content>Nothing here in the dev app.</Content>
            </Page>
          ),
        },
      }),
    ],
  });

/** Fictional stand-ins for the pages the Ember nav places. */
export const devPagePlugins = [
  stub('catalog', '/catalog', 'Catalog'),
  stub('cloud-agents', '/cloud-agents', 'Cloud agents'),
];

const fictionalAgents = [
  {
    id: 'ag_0a1b2c3d4e5f',
    title: 'Pick a storage layout',
    repo: 'acme/garden-app',
    status: 'needs_input',
  },
  {
    id: 'ag_5e7d9c1a2b3f',
    title: 'Paginate orders',
    repo: 'acme/acme-api',
    status: 'running',
  },
  {
    id: 'ag_7c4a2e9f0b6d',
    title: 'Fish completions',
    repo: 'acme/orbit-cli',
    status: 'queued',
  },
  {
    id: 'ag_9b2e4f6a8c1d',
    title: 'Watering schedule',
    repo: 'acme/garden-app',
    status: 'succeeded',
  },
];

const fictionalDocuments = [
  {
    title: 'acme-api',
    text: 'Orders and webhooks service',
    location: '/catalog/default/component/acme-api',
    type: 'software-catalog',
  },
  {
    title: 'garden-app',
    text: 'Garden planner web app',
    location: '/catalog/default/component/garden-app',
    type: 'software-catalog',
  },
  {
    title: 'Local development',
    text: 'How to run lantern-docs locally',
    location: '/docs/default/component/lantern-docs',
    type: 'techdocs',
  },
];

function searchResponse(url: URL) {
  const term = (url.searchParams.get('term') ?? '').toLowerCase();
  const results = fictionalDocuments
    .filter(
      doc => !term || `${doc.title} ${doc.text}`.toLowerCase().includes(term),
    )
    .map(({ type, ...document }) => ({ type, document }));
  return new Response(
    JSON.stringify({ results, numberOfResults: results.length }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
}

async function devFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(
    String(input instanceof Request ? input.url : input),
    window.location.href,
  );
  if (url.pathname.endsWith('/api/search/query')) return searchResponse(url);
  if (url.pathname.endsWith('/api/cloud-agents/agents')) {
    const status = url.searchParams.get('status');
    return new Response(
      JSON.stringify(
        status
          ? fictionalAgents.filter(a => a.status === status)
          : fictionalAgents,
      ),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
  return fetch(input, init);
}

/** A fake GitHub session and fictional cloud-agents answers for the dev app. */
export const devAppModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    ApiBlueprint.make({
      name: 'fetch',
      params: defineParams =>
        defineParams({
          api: fetchApiRef,
          deps: {},
          factory: () => ({ fetch: devFetch }),
        }),
    }),
    ApiBlueprint.make({
      name: 'github-auth',
      params: defineParams =>
        defineParams({
          api: githubAuthApiRef,
          deps: {},
          factory: () => ({
            getAccessToken: async () => 'dev-token',
            getIdToken: async () => '',
            getProfile: async () => undefined,
            getBackstageIdentity: async () => undefined,
            getCredentials: async () => ({}),
            signIn: async () => undefined,
            signOut: async () => undefined,
            sessionState$: () => ({
              subscribe: () => ({ unsubscribe: () => undefined, closed: true }),
              [Symbol.observable]() {
                return this;
              },
            }),
          }),
        }),
    }),
  ],
});
