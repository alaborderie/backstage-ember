import { useCallback, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Inbox,
  LayoutGrid,
  Lock,
  MessageSquare,
  Bot,
  Search,
  Sparkle,
  CircleSlash,
} from 'lucide-react';
import { githubHomeApiRef, type GithubIssue } from '../api/types';
import {
  defaultExpanded,
  groupIssues,
  handToAgentHref,
  ROWS_PER_GROUP,
  QUIET_AFTER_DAYS,
  type IssueGroup,
} from '../logic/issues';
import { ago } from '../logic/time';
import { useGithubData } from '../hooks/useGithubData';
import { parseStringList, usePersistentState } from '../hooks/usePersistentState';
import { useNow } from '../hooks/useNow';
import {
  ErrorState,
  ICON_SM,
  ICON_XS,
  Skeleton,
  StaleBanner,
  StateMessage,
  WidgetFrame,
} from './WidgetParts';
import styles from './Home.module.css';

/** @public */
export interface IssuesWidgetProps {
  /** GitHub user or organization whose repositories to list; defaults to the signed-in user. */
  owner?: string;
  /** Labels the "Hide" chip filters out, `on-hold` by default. */
  hiddenLabels?: string[];
}

type GroupBy = 'repository' | 'system' | 'project';

export const ISSUES_WIDGET_ID = 'github-open-issues';

const humanize = (label: string) => label.replace(/[-_]/g, ' ');

function IssueRow({ issue, index, now }: { issue: GithubIssue; index: number; now: number }) {
  const extra = issue.labels.length - 2;
  return (
    <li className={styles.row} style={{ '--i': index } as React.CSSProperties}>
      <CircleDot {...ICON_SM} />
      <div className={styles.rowMain}>
        <a className={styles.rowTitle} href={issue.url} target="_blank" rel="noopener noreferrer">
          {issue.title}
        </a>
        <div className={styles.rowMeta}>
          <span className={styles.mono}>#{issue.number}</span>
          <span>{ago(issue.updatedAt, now)}</span>
          {issue.labels.slice(0, 2).map(label => (
            <span key={label.name} className={styles.label}>
              <i style={{ background: `#${label.color}` }} aria-hidden="true" />
              {label.name}
            </span>
          ))}
          {extra > 0 && <span aria-label={`${extra} more labels`}>+{extra}</span>}
          {issue.comments > 0 && (
            <span className={styles.label} aria-label={`${issue.comments} comments`}>
              <MessageSquare {...ICON_XS} />
              {issue.comments}
            </span>
          )}
          {issue.agentOnIt && (
            <span className={styles.label}>
              <Bot {...ICON_XS} />
              agent on it
            </span>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        <Link
          className={styles.act}
          to={handToAgentHref(issue)}
          aria-label={`Hand issue #${issue.number} to an agent`}
        >
          <Sparkle {...ICON_XS} />
          <span className={styles.actLabel}>Hand to agent</span>
        </Link>
      </div>
    </li>
  );
}

function Group(props: {
  group: IssueGroup;
  open: boolean;
  showMore: boolean;
  onToggle: (key: string) => void;
  now: number;
}) {
  const { group, open, now } = props;
  const { repository } = group;
  const panelId = `issues-${group.key.replace(/\W/g, '-')}`;
  const shown = group.issues.slice(0, ROWS_PER_GROUP);
  const more = group.issues.length - shown.length;
  return (
    <div>
      <button
        type="button"
        className={styles.groupHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => props.onToggle(group.key)}
      >
        <ChevronRight {...ICON_SM} className={styles.chev} />
        <span className={styles.groupName}>{repository.name}</span>
        {repository.isPrivate && (
          <span className={styles.meta} title="Private">
            <Lock {...ICON_XS} />
            <span className={styles.srOnly}>Private</span>
          </span>
        )}
        {repository.language && (
          <span className={styles.meta}>
            <i className={styles.dot} style={{ background: repository.language.color }} aria-hidden="true" />
            {repository.language.name}
          </span>
        )}
        <span className={styles.spacer} />
        <span className={styles.meta}>{ago(group.updatedAt, now)}</span>
        <span className={styles.count} aria-label={`${group.issues.length} issues`}>
          {group.issues.length}
        </span>
      </button>
      {open && (
        <ul className={styles.panel} id={panelId}>
          {shown.map((issue, index) => (
            <IssueRow key={issue.url} issue={issue} index={index} now={now} />
          ))}
          {props.showMore && more > 0 && (
            <li>
              <a
                className={styles.moreLink}
                href={`https://github.com/${repository.owner}/${repository.name}/issues`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {more} more in {repository.name}
                <ExternalLink {...ICON_XS} />
              </a>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** The Open issues home widget. @public */
export function IssuesWidget({ owner, hiddenLabels = ['on-hold'] }: IssuesWidgetProps) {
  const api = useApi(githubHomeApiRef);
  const now = useNow();
  const load = useCallback(() => api.getOpenIssues(owner ? { owner } : {}), [api, owner]);
  const { snapshot, loading, failure, refresh } = useGithubData<GithubIssue>(
    `issues:${owner ?? '@viewer'}`,
    load,
  );
  const [query, setQuery] = useState('');
  const [hideLabeled, setHideLabeled] = useState(true);
  const [quietOpen, setQuietOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('repository');
  const [storedExpanded, setExpanded] = usePersistentState('issues.expanded', parseStringList);

  const grouping = useMemo(
    () =>
      groupIssues(snapshot?.items ?? [], {
        hideLabeled: hiddenLabels.length > 0 && hideLabeled,
        hiddenLabels,
        query,
        now,
      }),
    [snapshot, hiddenLabels, hideLabeled, query, now],
  );
  const expanded = useMemo(
    () => new Set(storedExpanded ?? defaultExpanded(grouping)),
    [storedExpanded, grouping],
  );
  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded([...next]);
  };

  const selectId = useId();
  const searching = query.trim().length > 0;
  const hideLabel = `Hide ${hiddenLabels.map(humanize).join(', ')}`;

  const tools = (
    <div className={styles.tools}>
      <label className={styles.field}>
        <Search {...ICON_SM} />
        <span className={styles.srOnly}>Filter issues</span>
        <input
          type="search"
          placeholder="Filter issues"
          autoComplete="off"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>
      {hiddenLabels.length > 0 && (
        <button
          type="button"
          className={styles.chip}
          aria-pressed={hideLabeled}
          onClick={() => setHideLabeled(value => !value)}
        >
          <Check {...ICON_XS} className={styles.check} />
          {hideLabel}
          <span className={styles.chipCount}>{grouping.hiddenCount}</span>
        </button>
      )}
      <span className={styles.select}>
        <label className={styles.srOnly} htmlFor={selectId}>
          Group by
        </label>
        <select id={selectId} value={groupBy} onChange={event => setGroupBy(event.target.value as GroupBy)}>
          <option value="repository">By repository</option>
          <option value="system">By catalog System</option>
          <option value="project">By GitHub Project</option>
        </select>
        <ChevronDown {...ICON_XS} />
      </span>
    </div>
  );

  const renderBody = () => {
    if (!snapshot) {
      if (failure) return <ErrorState failure={failure} now={now} onRetry={refresh} />;
      return <Skeleton rows={7} />;
    }
    if (!snapshot.items.length) {
      return (
        <StateMessage Icon={Inbox} title="No open issues">
          Nothing is open on your repositories. Enjoy it.
        </StateMessage>
      );
    }
    if (groupBy === 'system') {
      return (
        <StateMessage Icon={LayoutGrid} title="No catalog Systems yet">
          Grouping by System needs <code>spec.system</code> on your catalog Components.
        </StateMessage>
      );
    }
    if (groupBy === 'project') {
      return (
        <StateMessage Icon={Lock} title="GitHub Projects need one more scope">
          Reading Projects (v2) needs the <code>read:project</code> permission on sign-in.
        </StateMessage>
      );
    }
    if (!grouping.total) {
      if (searching) {
        return (
          <StateMessage Icon={Search} title="No matching issues">
            Nothing matches “{query.trim()}” in the loaded issues.
          </StateMessage>
        );
      }
      return (
        <StateMessage
          Icon={CircleSlash}
          title={`Every open issue is labeled ${hiddenLabels.map(humanize).join(', ')}`}
          action={
            <button type="button" className={styles.button} onClick={() => setHideLabeled(false)}>
              Show them
            </button>
          }
        >
          {grouping.hiddenCount} issues are hidden by the filter.
        </StateMessage>
      );
    }
    const quietIssues = grouping.quiet.reduce((sum, group) => sum + group.issues.length, 0);
    const renderGroup = (group: IssueGroup) => (
      <Group
        key={group.key}
        group={group}
        open={searching || expanded.has(group.key)}
        showMore={!searching}
        onToggle={toggle}
        now={now}
      />
    );
    return (
      <>
        {grouping.active.map(renderGroup)}
        {grouping.quiet.length > 0 && (
          <>
            <button
              type="button"
              className={styles.quietFold}
              aria-expanded={quietOpen}
              aria-controls="github-quiet-projects"
              onClick={() => setQuietOpen(value => !value)}
            >
              <ChevronRight {...ICON_SM} className={styles.chev} />
              <strong>
                {grouping.quiet.length} quiet {grouping.quiet.length === 1 ? 'project' : 'projects'}
              </strong>
              <span>
                no activity in {QUIET_AFTER_DAYS} days · {quietIssues}{' '}
                {quietIssues === 1 ? 'issue' : 'issues'}
              </span>
            </button>
            {quietOpen && <div id="github-quiet-projects">{grouping.quiet.map(renderGroup)}</div>}
          </>
        )}
      </>
    );
  };

  return (
    <WidgetFrame
      id={ISSUES_WIDGET_ID}
      title="Open issues"
      Icon={CircleDot}
      count={snapshot ? grouping.total : undefined}
      fetchedAt={snapshot?.fetchedAt}
      now={now}
      loading={loading}
      busy={loading && !snapshot}
      onRefresh={refresh}
      index={1}
      tools={tools}
      banner={
        snapshot && failure ? (
          <StaleBanner failure={failure} fetchedAt={snapshot.fetchedAt} now={now} onRetry={refresh} />
        ) : undefined
      }
    >
      {renderBody()}
    </WidgetFrame>
  );
}
