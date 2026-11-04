/**
 * GitHub open issues and pull requests widgets, and a greeting layout, for
 * the Backstage home page.
 *
 * @packageDocumentation
 */
import { z } from 'zod/v4';
import {
  ApiBlueprint,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import {
  HomePageLayoutBlueprint,
  HomePageWidgetBlueprint,
} from '@backstage/plugin-home-react/alpha';
import { githubHomeApiRef } from './api/types';
import { GithubGraphqlClient } from './api/GithubGraphqlClient';
import { OwnFrame } from './components/OwnFrame';

const githubHomeApi = ApiBlueprint.makeWithOverrides({
  name: 'github',
  configSchema: {
    scopes: z.array(z.string()).default([]),
  },
  factory(originalFactory, { config }) {
    return originalFactory(defineParams =>
      defineParams({
        api: githubHomeApiRef,
        deps: { githubAuthApi: githubAuthApiRef },
        factory: ({ githubAuthApi }) =>
          new GithubGraphqlClient({
            auth: githubAuthApi,
            scopes: config.scopes,
          }),
      }),
    );
  },
});

const issuesWidget = HomePageWidgetBlueprint.makeWithOverrides({
  name: 'github-issues',
  configSchema: {
    owner: z.string().optional(),
    hiddenLabels: z.array(z.string()).default(['on-hold']),
  },
  *factory(originalFactory, { config }) {
    yield* originalFactory({
      name: 'GithubOpenIssues',
      title: 'Open issues',
      description:
        'Open GitHub issues in your repositories, grouped by repository',
      components: () =>
        import('./components/IssuesWidget').then(m => ({
          Content: m.IssuesWidget,
        })),
      layout: {
        width: { defaultColumns: 7 },
        height: { minRows: 8, defaultRows: 17 },
      },
      componentProps: {
        Renderer: OwnFrame,
        hiddenLabels: config.hiddenLabels,
        ...(config.owner ? { owner: config.owner } : {}),
      },
    });
  },
});

const pullRequestsWidget = HomePageWidgetBlueprint.make({
  name: 'github-pull-requests',
  params: {
    name: 'GithubPullRequests',
    title: 'Pull requests',
    description:
      'Your open GitHub pull requests and review requests, filtered by project',
    components: () =>
      import('./components/PullRequestsWidget').then(m => ({
        Content: m.PullRequestsWidget,
      })),
    layout: {
      width: { defaultColumns: 5 },
      height: { minRows: 6, defaultRows: 12 },
    },
    componentProps: { Renderer: OwnFrame },
  },
});

const greetingLayout = HomePageLayoutBlueprint.make({
  name: 'ember',
  params: {
    loader: () => import('./components/HomeLayout').then(m => m.HomeLayout),
  },
});

/**
 * Installs the GitHub home widgets, their API and the greeting layout into
 * the home plugin.
 *
 * @public
 */
const homeModuleGithub = createFrontendModule({
  pluginId: 'home',
  extensions: [githubHomeApi, issuesWidget, pullRequestsWidget, greetingLayout],
});

export default homeModuleGithub;
export { homeModuleGithub };
export {
  githubHomeApiRef,
  type GithubHomeApi,
  type GithubIssue,
  type GithubLabel,
  type GithubPullRequest,
  type GithubRepository,
  type CheckRollup,
  type PullRequestScope,
} from './api/types';
export {
  GithubGraphqlClient,
  type GithubGraphqlClientOptions,
} from './api/GithubGraphqlClient';
export { GithubHomeError, type GithubFailure } from './api/errors';
