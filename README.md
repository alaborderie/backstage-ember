# backstage-ember

Ember theme, navigation and GitHub home widgets for Antoine's Backstage. The
app consumes this repository as source, the same way it consumes
`backstage-plugin-cloud-agents`: a pinned Git submodule whose plugin
directories are Yarn workspaces. Nothing is published to npm.

| Package                                            | Plugin | What it adds                                                                                                                                                    |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@alaborderie/backstage-plugin-app-module-ember`   | `app`  | `theme:app/ember` (Material UI theme and BUI variables, Geist fonts) and `nav-content:app/ember` (sidebar, search, needs-you badge, mobile top and bottom bars) |
| `@alaborderie/backstage-plugin-home-module-github` | `home` | `api:home/github`, the `home-page-widget:home/github-issues` and `home-page-widget:home/github-pull-requests` widgets, and `home-page-layout:home/ember`        |

Both are `createFrontendModule` packages for the new frontend system, built
against Backstage 1.56 (`@backstage/frontend-plugin-api` 0.18, `@backstage/ui`
0.19). They use public blueprints and component overrides only.

## Install in the app

1. Add the submodule and the workspaces.

   ```sh
   git submodule add https://github.com/alaborderie/backstage-ember.git external/ember
   git -C external/ember checkout <full-commit-sha>
   ```

   In the root `package.json`, add `"external/ember/plugins/*"` to
   `workspaces`. In the `Dockerfile`, copy `external/ember/plugins` next to
   `external/cloud-agents/plugins`.

2. Add both packages to `packages/app/package.json`:

   ```json
   "@alaborderie/backstage-plugin-app-module-ember": "workspace:^",
   "@alaborderie/backstage-plugin-home-module-github": "workspace:^"
   ```

   `app.packages: all` discovers them. To list them explicitly, import the
   default exports and add them to `createApp({ features })`.

3. Delete `packages/app/src/modules/nav` and `packages/app/src/modules/home`,
   and their imports in `App.tsx`. The Ember nav replaces the first. The app
   can keep only one `nav-content` extension.

4. Run `yarn install`, then `yarn tsc`.

## App config

```yaml
app:
  extensions:
    # Ember is the only theme.
    - theme:app/light: false
    - theme:app/dark: false
    # Remove any `page:catalog` override that mounts the catalog at `/`.
    - page:home:
        config:
          path: /
          defaultConfig:
            - {
                component: GithubOpenIssues,
                column: 0,
                row: 0,
                width: 7,
                height: 17,
              }
            - {
                component: GithubPullRequests,
                column: 7,
                row: 0,
                width: 5,
                height: 10,
              }
    - home-page-widget:home/github-issues:
        config:
          # Repositories of this user or organization. Defaults to the signed-in user.
          owner: alaborderie
          # Labels the "Hide on hold" chip filters out. Defaults to [on-hold].
          hiddenLabels: [on-hold]
    # Optional. Extra OAuth scopes for the GitHub token. A GitHub App ignores
    # scopes, so leave this empty. An OAuth App needs `repo` for private repositories.
    - api:home/github:
        config:
          scopes: []
```

The grid uses 40px rows, so `height: 17` is about 1,000px.

## GitHub access

The widgets call GitHub GraphQL from the browser with the signed-in user's
token from `githubAuthApiRef`. There is no backend plugin. With a GitHub App,
the user token reads what both the user and the App installation can read, so
the App needs **Issues: read**, **Pull requests: read**, **Checks: read** and
**Metadata: read** on the repositories.

- Issues: `is:open is:issue archived:false user:<owner>`, 100 per page, up to 10 pages.
- Pull requests: `is:open is:pr author:@me archived:false` and `review-requested:@me`.
- Results are cached per user through `storageApiRef`. The widgets paint the
  cached snapshot, then refresh when it is older than a minute, every five
  minutes, on window focus, and on the refresh button. Concurrent identical
  requests share one call.
- On a 403 or 429 rate limit, the widgets keep cached data on screen and show
  the reset time from `x-ratelimit-reset` or `retry-after`.

`githubHomeApiRef` is exported. A backend implementation can replace
`api:home/github` without changing the widgets.

## Contracts with cloud-agents

There is no package dependency between the two repositories.

- **Hand to agent.** Each issue row links to
  `/cloud-agents/new?repo=<owner>/<name>&issue=<number>&title=<encoded title>`.
- **Needs-you badge.** The nav polls
  `GET <discovery 'cloud-agents'>/agents?status=needs_input` every 30 seconds
  through `fetchApiRef` and shows the count. On a 404 it stops polling, and on
  any error it shows nothing. The greeting reads `GET /agents` for its summary
  and hides agents when that call fails.
- **Agent links.** A pull request from `cloud-agent/<id>` links to
  `/cloud-agents/agents/ag_<id>`.
- **Tokens.** The theme sets BUI variables under
  `body[data-theme-name='ember']`. Components read BUI variables, and these
  `--ember-*` variables where BUI has no token: `--ember-fg-tertiary`,
  `--ember-line-input`, `--ember-accent-fg`, `--ember-scrim`, `--ember-e-1`
  to `--ember-e-3`, `--ember-d-*` durations, `--ember-ease-out`,
  `--ember-ease-inout`, `--ember-ease-spring` and `--ember-target`.

## Develop

Use Node.js 24 and Corepack.

```sh
corepack enable
yarn install
yarn start:app    # theme and nav on fictional pages, http://localhost:3000
yarn start:home   # the home page with mocked GitHub data, http://localhost:3000
```

The home dev app answers GitHub GraphQL with fictional data, so the real
client and its pagination run. Add `?github=loading`, `empty`, `ratelimit`,
`expired` or `error` to the URL to see each state, and `?fresh` to clear the
cached snapshots. After 16 seconds, a refresh shows a new agent pull request
sliding in.

```sh
yarn tsc
yarn lint
yarn prettier:check
yarn test
yarn build
```

CI runs the same commands on pull requests and on `main`.

## Differences from the design proposal

- The sidebar uses upstream `Sidebar` widths, 224px open and 72px closed,
  because `SidebarPage` pads the content with those values.
- The mobile layout starts below 600px, upstream's `xs` breakpoint, because
  `createUnifiedTheme` does not take custom breakpoints.
- Widgets live in upstream's resizable grid, so each has a fixed height and
  scrolls inside.
- Geist and Geist Mono are bundled from `@fontsource-variable` instead of
  Google Fonts, so the app needs no extra CSP entry.
