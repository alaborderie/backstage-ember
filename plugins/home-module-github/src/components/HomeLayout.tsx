import { Fragment, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { CustomHomepageGrid } from '@backstage/plugin-home';
import type { HomePageLayoutProps, HomePageWidgetData } from '@backstage/plugin-home-react/alpha';
import { Bot, CircleDot, GitPullRequest, Plus } from 'lucide-react';
import {
  githubHomeApiRef,
  type GithubIssue,
  type GithubPullRequest,
} from '../api/types';
import { groupIssues } from '../logic/issues';
import { agentHref } from '../logic/pullRequests';
import { greeting } from '../logic/time';
import { useGithubData } from '../hooks/useGithubData';
import { useNow } from '../hooks/useNow';
import { ISSUES_WIDGET_ID, type IssuesWidgetProps } from './IssuesWidget';
import { PULL_REQUESTS_WIDGET_ID } from './PullRequestsWidget';
import { ICON_SM } from './WidgetParts';
import styles from './HomeLayout.module.css';

const GRID = {
  breakpoints: { xl: 900, lg: 800, md: 700, sm: 600, xs: 400, xxs: 0 },
  cols: { xl: 12, lg: 12, md: 12, sm: 1, xs: 1, xxs: 1 },
  rowHeight: 40,
  containerMargin: [20, 20] as [number, number],
  containerPadding: [0, 0] as [number, number],
};

export interface AgentCounts {
  needsYou: number;
  working: number;
}

/** Counts agents from `GET <cloud-agents>/agents`; undefined when the plugin is absent. */
function useAgentCounts(): AgentCounts | undefined {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [counts, setCounts] = useState<AgentCounts>();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const base = await discoveryApi.getBaseUrl('cloud-agents');
        const response = await fetchApi.fetch(`${base}/agents`);
        if (!response.ok) return;
        const body: unknown = await response.json();
        const agents = Array.isArray(body) ? body : [];
        const status = (agent: unknown) =>
          agent && typeof agent === 'object' ? (agent as { status?: unknown }).status : undefined;
        if (active) {
          setCounts({
            needsYou: agents.filter(a => status(a) === 'needs_input').length,
            working: agents.filter(a => status(a) === 'running' || status(a) === 'queued').length,
          });
        }
      } catch {
        // The cloud-agents plugin is optional; the greeting leaves agents out.
      }
    })();
    return () => {
      active = false;
    };
  }, [discoveryApi, fetchApi]);
  return counts;
}

function useFirstName(): string | undefined {
  const identityApi = useApi(identityApiRef);
  const [name, setName] = useState<string>();
  useEffect(() => {
    let active = true;
    identityApi
      .getProfileInfo()
      .then(profile => {
        const first = profile.displayName?.trim().split(/\s+/)[0];
        if (active && first) setName(first);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [identityApi]);
  return name;
}

function issuesWidgetProps(widgets: HomePageWidgetData[]): IssuesWidgetProps {
  const widget = widgets.find(w => w.node.spec.id === 'home-page-widget:home/github-issues');
  return (widget?.component.props ?? {}) as IssuesWidgetProps;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function dateLabel(date: Date): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', options).format(date);
  return `${part({ weekday: 'long' })}, ${part({ day: 'numeric', month: 'long' })}`;
}

function scrollToWidget(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  target.querySelector<HTMLElement>('h2')?.setAttribute('tabindex', '-1');
  target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

function Summary(props: {
  agents?: AgentCounts;
  pullRequests?: number;
  issues?: number;
  projects?: number;
}) {
  const { agents } = props;
  let lead = '';
  let hot: string | undefined;
  if (agents) {
    if (agents.needsYou) {
      hot = agents.needsYou === 1 ? 'One agent is waiting for you' : `${agents.needsYou} agents are waiting for you`;
      lead = agents.working ? `, ${agents.working === 1 ? 'one is' : `${agents.working} are`} working. ` : '. ';
    } else {
      lead = agents.working
        ? `${agents.working === 1 ? 'One agent is' : `${agents.working} agents are`} working. `
        : 'All agents are idle. ';
    }
  }
  const loaded = props.pullRequests !== undefined && props.issues !== undefined;
  return (
    <p className={styles.summary}>
      {hot && (
        <Link className={styles.hot} to="/cloud-agents?status=needs_input">
          {hot}
        </Link>
      )}
      {lead}
      {loaded ? (
        <>
          You have{' '}
          <a href={`#${PULL_REQUESTS_WIDGET_ID}`} onClick={e => scrollToWidget(e, PULL_REQUESTS_WIDGET_ID)}>
            {plural(props.pullRequests!, 'open pull request', 'open pull requests')}
          </a>{' '}
          and{' '}
          <a href={`#${ISSUES_WIDGET_ID}`} onClick={e => scrollToWidget(e, ISSUES_WIDGET_ID)}>
            {plural(props.issues!, 'issue', 'issues')}
          </a>{' '}
          across {plural(props.projects ?? 0, 'project', 'projects')}.
        </>
      ) : (
        'Loading your GitHub summary…'
      )}
    </p>
  );
}

function Tile(props: {
  id: string;
  Icon: typeof Bot;
  label: string;
  value: number | undefined;
  sub: string;
  hot?: boolean;
  index: number;
}) {
  const { Icon } = props;
  const className = `${styles.tile} ${props.hot ? styles.tileHot : ''}`;
  const style = { '--i': props.index } as React.CSSProperties;
  const content = (
    <>
      <span className={styles.tileHead}>
        <Icon {...ICON_SM} />
        <span className={styles.tileLabel}>{props.label}</span>
        {props.hot && <span className={styles.liveDot} aria-hidden="true" />}
      </span>
      <span className={styles.tileNum}>{props.value ?? '–'}</span>
      <span className={styles.tileSub}>{props.sub}</span>
    </>
  );
  return props.id.startsWith('/') ? (
    <Link className={className} style={style} to={props.id}>
      {content}
    </Link>
  ) : (
    <a className={className} style={style} href={`#${props.id}`} onClick={e => scrollToWidget(e, props.id)}>
      {content}
    </a>
  );
}

/**
 * The home layout: a greeting with a one-sentence summary and three
 * at-a-glance tiles above upstream's customizable widget grid.
 */
export function HomeLayout({ widgets, defaultConfig }: HomePageLayoutProps) {
  const api = useApi(githubHomeApiRef);
  const now = useNow(60_000);
  const firstName = useFirstName();
  const agents = useAgentCounts();
  const { owner, hiddenLabels = ['on-hold'] } = issuesWidgetProps(widgets);

  const loadIssues = useCallback(() => api.getOpenIssues(owner ? { owner } : {}), [api, owner]);
  const loadPulls = useCallback(() => api.getPullRequests({ scope: 'authored' }), [api]);
  const issues = useGithubData<GithubIssue>(`issues:${owner ?? '@viewer'}`, loadIssues);
  const pulls = useGithubData<GithubPullRequest>('pulls:authored', loadPulls);

  const issueStats = useMemo(() => {
    if (!issues.snapshot) return undefined;
    const grouping = groupIssues(issues.snapshot.items, {
      hideLabeled: true,
      hiddenLabels,
      query: '',
      now,
    });
    return {
      total: grouping.total,
      hidden: grouping.hiddenCount,
      projects: grouping.active.length + grouping.quiet.length,
    };
  }, [issues.snapshot, hiddenLabels, now]);
  const prItems = pulls.snapshot?.items;
  const agentPrs = prItems?.filter(pr => agentHref(pr)).length ?? 0;

  const gridConfig = useMemo(
    () =>
      defaultConfig?.map(item => ({
        component: item.component,
        x: item.column,
        y: item.row,
        width: item.width,
        height: item.height,
        movable: item.movable,
        deletable: item.deletable,
        resizable: item.resizable,
      })),
    [defaultConfig],
  );

  // Upstream's grid mints new widget IDs whenever it re-renders before the
  // user customizes it, which remounts every widget; keep it out of this
  // component's re-renders.
  const grid = useMemo(
    () => (
      <CustomHomepageGrid config={gridConfig} {...GRID}>
        {widgets.map((widget, index) => (
          <Fragment key={widget.name ?? index}>{widget.component}</Fragment>
        ))}
      </CustomHomepageGrid>
    ),
    [gridConfig, widgets],
  );

  const date = new Date(now);
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{dateLabel(date)}</p>
          <h1 className={styles.greeting}>
            {greeting(date)}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <Summary
            agents={agents}
            pullRequests={prItems?.length}
            issues={issueStats?.total}
            projects={issueStats?.projects}
          />
        </div>
        {agents && (
          <div className={styles.heroActions}>
            <Link className={styles.primary} to="/cloud-agents/new">
              <Plus {...ICON_SM} />
              New agent
            </Link>
          </div>
        )}
      </section>

      <nav className={`${styles.pulse} ${agents ? '' : styles.pulseTwo}`} aria-label="At a glance">
        <Tile
          id={ISSUES_WIDGET_ID}
          Icon={CircleDot}
          label="Open issues"
          value={issueStats?.total}
          sub={
            issueStats?.hidden
              ? `${issueStats.hidden} ${hiddenLabels.join(', ').replace(/-/g, ' ')} hidden`
              : 'nothing hidden'
          }
          index={0}
        />
        <Tile
          id={PULL_REQUESTS_WIDGET_ID}
          Icon={GitPullRequest}
          label="Pull requests"
          value={prItems?.length}
          sub={`${agentPrs} opened by agents`}
          index={1}
        />
        {agents && (
          <Tile
            id="/cloud-agents"
            Icon={Bot}
            label="Agents"
            value={agents.needsYou + agents.working}
            sub={agents.needsYou ? `${agents.needsYou} needs you` : 'none waiting'}
            hot={agents.needsYou > 0}
            index={2}
          />
        )}
      </nav>

      <div className={styles.grid}>{grid}</div>
    </div>
  );
}
