import {
  ApiBlueprint,
  createFrontendModule,
  createFrontendPlugin,
  createRouteRef,
  fetchApiRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
} from '@backstage/core-components';
import { Button } from '@material-ui/core';
import ExtensionIcon from '@material-ui/icons/Extension';

function StubPage({ title }: { title: string }) {
  return (
    <Page themeId="tool">
      <Header title={title} subtitle="A fictional page that shows the theme on core-components." />
      <Content>
        <ContentHeader title="Entities">
          <Button variant="contained" color="primary">
            Create
          </Button>
        </ContentHeader>
        <InfoCard title="About">Fictional data for the Ember dev app.</InfoCard>
      </Content>
    </Page>
  );
}

const stub = (pluginId: string, path: string, title: string) =>
  createFrontendPlugin({
    pluginId,
    extensions: [
      PageBlueprint.make({
        params: {
          path,
          title,
          icon: <ExtensionIcon />,
          routeRef: createRouteRef(),
          noHeader: true,
          loader: async () => <StubPage title={title} />,
        },
      }),
    ],
  });

/** Fictional stand-ins for the pages the Ember nav places. */
export const devPagePlugins = [
  stub('home', '/', 'Home'),
  stub('catalog', '/catalog', 'Catalog'),
  stub('cloud-agents', '/cloud-agents', 'Cloud agents'),
  stub('api-docs', '/api-docs', 'APIs'),
  stub('techdocs', '/docs', 'Docs'),
  stub('scaffolder', '/create', 'Create'),
];

const fictionalAgents = [
  { id: 'ag_0a1b2c3d4e5f', title: 'Pick a storage layout', repo: 'acme/garden-app', status: 'needs_input' },
];

const fictionalDocuments = [
  { title: 'acme-api', text: 'Orders and webhooks service', location: '/catalog/default/component/acme-api', type: 'software-catalog' },
  { title: 'garden-app', text: 'Garden planner web app', location: '/catalog/default/component/garden-app', type: 'software-catalog' },
  { title: 'Local development', text: 'How to run lantern-docs locally', location: '/docs/default/component/lantern-docs', type: 'techdocs' },
];

function searchResponse(url: URL) {
  const term = (url.searchParams.get('term') ?? '').toLowerCase();
  const results = fictionalDocuments
    .filter(doc => !term || `${doc.title} ${doc.text}`.toLowerCase().includes(term))
    .map(({ type, ...document }) => ({ type, document }));
  return new Response(JSON.stringify({ results, numberOfResults: results.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function devFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input instanceof Request ? input.url : input), window.location.href);
  if (url.pathname.endsWith('/api/search/query')) return searchResponse(url);
  if (url.pathname.endsWith('/api/cloud-agents/agents')) {
    return new Response(JSON.stringify(fictionalAgents), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return fetch(input, init);
}

/** Answers the needs-you badge request with one fictional agent. */
export const devFetchModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    ApiBlueprint.make({
      name: 'fetch',
      params: defineParams =>
        defineParams({ api: fetchApiRef, deps: {}, factory: () => ({ fetch: devFetch }) }),
    }),
  ],
});
