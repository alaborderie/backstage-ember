import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@backstage/core-plugin-api';
import {
  Bot,
  Check,
  CircleCheck,
  CircleDot,
  CircleX,
  GitBranch,
  GitPullRequest,
  GitPullRequestDraft,
} from 'lucide-react';
import {
  githubHomeApiRef,
  type CheckRollup,
  type GithubPullRequest,
  type PullRequestScope,
} from '../api/types';
import {
  agentHref,
  diffScale,
  filterByProjects,
  projectChips,
  toggleProject,
} from '../logic/pullRequests';
import { repositoryKey } from '../logic/issues';
import { ago } from '../logic/time';
import { useGithubData } from '../hooks/useGithubData';
import {
  parseStringList,
  usePersistentState,
} from '../hooks/usePersistentState';
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

export const PULL_REQUESTS_WIDGET_ID = 'github-pull-requests';

const SCOPES: { scope: PullRequestScope; label: string }[] = [
  { scope: 'authored', label: 'Opened by me' },
  { scope: 'review-requested', label: 'Review requested' },
];

const CHECKS: Record<
  Exclude<CheckRollup, 'none'>,
  { label: string; className: string; Icon: typeof CircleCheck }
> = {
  passing: {
    label: 'Checks passing',
    className: styles.checkPassing!,
    Icon: CircleCheck,
  },
  failing: {
    label: 'Checks failing',
    className: styles.checkFailing!,
    Icon: CircleX,
  },
  running: {
    label: 'Checks running',
    className: styles.checkRunning!,
    Icon: CircleDot,
  },
};

const prKey = (pr: GithubPullRequest) =>
  `${repositoryKey(pr.repository)}#${pr.number}`;
const formatCount = (n: number) => n.toLocaleString('en');

function Checks({ rollup }: { rollup: CheckRollup }) {
  if (rollup === 'none') return null;
  const { label, className, Icon } = CHECKS[rollup];
  return (
    <span className={className} title={label}>
      <Icon {...ICON_XS} />
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}

function PullRequestRow({
  pr,
  index,
  now,
  fresh,
}: {
  pr: GithubPullRequest;
  index: number;
  now: number;
  fresh: boolean;
}) {
  const agent = agentHref(pr);
  const scale = diffScale(pr);
  const Icon = pr.isDraft ? GitPullRequestDraft : GitPullRequest;
  return (
    <li
      className={[
        styles.pr,
        pr.isDraft ? styles.draft : '',
        fresh ? styles.flash : '',
      ].join(' ')}
      style={{ '--i': index } as React.CSSProperties}
    >
      <Icon {...ICON_SM} />
      <div style={{ minWidth: 0 }}>
        <a
          className={styles.rowTitle}
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {pr.title}
        </a>
        <div className={styles.rowMeta}>
          <span>
            {pr.repository.name}{' '}
            <span className={styles.mono}>#{pr.number}</span>
          </span>
          <span className={styles.branch} title={pr.headRef}>
            <GitBranch {...ICON_XS} />
            {pr.headRef}
          </span>
          <span>{ago(pr.updatedAt, now)}</span>
        </div>
      </div>
      <div className={styles.side}>
        <div className={styles.statusRow}>
          {agent && (
            <Link
              className={styles.agentTag}
              to={agent}
              aria-label={`Agent that opened ${pr.repository.name} #${pr.number}`}
            >
              <Bot {...ICON_XS} />
              Agent
            </Link>
          )}
          {pr.isDraft && <span className={styles.draftTag}>Draft</span>}
          <Checks rollup={pr.checks} />
        </div>
        <span className={styles.diff}>
          <span className={styles.add}>+{formatCount(pr.additions)}</span>
          <span className={styles.del}>−{formatCount(pr.deletions)}</span>
          <span className={styles.srOnly}>
            {`${pr.additions} additions, ${pr.deletions} deletions`}
          </span>
          <span className={styles.diffbar} aria-hidden="true">
            <i
              className={styles.barAdd}
              style={{ transform: `scaleX(${scale.additions.toFixed(3)})` }}
            />
            <i
              className={styles.barDel}
              style={{ transform: `scaleX(${scale.deletions.toFixed(3)})` }}
            />
          </span>
        </span>
      </div>
    </li>
  );
}

function ScopeControl({
  scope,
  onChange,
}: {
  scope: PullRequestScope;
  onChange: (scope: PullRequestScope) => void;
}) {
  const refs = useRef(new Map<PullRequestScope, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ x: number; width: number }>();

  useLayoutEffect(() => {
    const measure = () => {
      const button = refs.current.get(scope);
      if (button) setThumb({ x: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    refs.current.forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [scope]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = SCOPES.findIndex(s => s.scope === scope);
    const next =
      SCOPES[
        (index + (event.key === 'ArrowRight' ? 1 : SCOPES.length - 1)) %
          SCOPES.length
      ]!;
    onChange(next.scope);
    refs.current.get(next.scope)?.focus();
  };

  return (
    <div
      className={styles.seg}
      role="radiogroup"
      aria-label="Pull request scope"
    >
      {thumb && (
        <span
          className={styles.segThumb}
          aria-hidden="true"
          style={{ width: thumb.width, transform: `translateX(${thumb.x}px)` }}
        />
      )}
      {SCOPES.map(item => (
        <button
          key={item.scope}
          ref={element => {
            if (element) refs.current.set(item.scope, element);
          }}
          type="button"
          role="radio"
          aria-checked={item.scope === scope}
          tabIndex={item.scope === scope ? 0 : -1}
          onClick={() => onChange(item.scope)}
          onKeyDown={onKeyDown}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Keys of rows that appeared since the previous refresh of the same scope. */
function useFreshKeys(
  scope: PullRequestScope,
  items: GithubPullRequest[] | undefined,
) {
  const seen = useRef(new Map<PullRequestScope, Set<string>>());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!items) return;
    const keys = new Set(items.map(prKey));
    const previous = seen.current.get(scope);
    if (
      previous &&
      previous.size === keys.size &&
      [...keys].every(key => previous.has(key))
    )
      return;
    seen.current.set(scope, keys);
    setFresh(
      previous
        ? new Set([...keys].filter(key => !previous.has(key)))
        : new Set(),
    );
  }, [scope, items]);
  return fresh;
}

/** The Pull requests home widget. @public */
export function PullRequestsWidget() {
  const api = useApi(githubHomeApiRef);
  const now = useNow();
  const [scope, setScope] = useState<PullRequestScope>('authored');
  const load = useCallback(() => api.getPullRequests({ scope }), [api, scope]);
  const { snapshot, loading, failure, refresh } =
    useGithubData<GithubPullRequest>(`pulls:${scope}`, load);
  const [storedProjects, setProjects] = usePersistentState(
    'pulls.projects',
    parseStringList,
  );
  const projects = useMemo(() => storedProjects ?? [], [storedProjects]);
  const items = snapshot?.items;
  const fresh = useFreshKeys(scope, items);

  const chips = useMemo(() => projectChips(items ?? []), [items]);
  const visible = useMemo(
    () => filterByProjects(items ?? [], projects),
    [items, projects],
  );

  const tools = (
    <>
      <div className={styles.tools}>
        <ScopeControl scope={scope} onChange={setScope} />
      </div>
      {chips.length > 0 && (
        <div
          className={styles.tools}
          role="group"
          aria-label="Filter by project"
        >
          <button
            type="button"
            className={styles.chip}
            aria-pressed={projects.length === 0}
            onClick={() => setProjects(toggleProject(projects, null))}
          >
            <Check {...ICON_XS} className={styles.check} />
            All projects
          </button>
          {chips.map(chip => (
            <button
              key={chip.key}
              type="button"
              className={styles.chip}
              aria-pressed={projects.includes(chip.key)}
              onClick={() => setProjects(toggleProject(projects, chip.key))}
            >
              <Check {...ICON_XS} className={styles.check} />
              {chip.label}
              <span className={styles.chipCount}>{chip.count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  const renderBody = () => {
    if (!snapshot) {
      if (failure)
        return <ErrorState failure={failure} now={now} onRetry={refresh} />;
      return <Skeleton rows={4} />;
    }
    if (!visible.length) {
      if (scope === 'review-requested' && !snapshot.items.length) {
        return (
          <StateMessage
            Icon={CircleCheck}
            title="Nothing waiting on your review"
          >
            Pull requests where someone requests your review land here.
          </StateMessage>
        );
      }
      if (projects.length && snapshot.items.length) {
        return (
          <StateMessage
            Icon={GitPullRequest}
            title="No open pull requests in these projects"
            action={
              <button
                type="button"
                className={styles.button}
                onClick={() => setProjects([])}
              >
                Clear the project filter
              </button>
            }
          >
            The selected projects have no open pull requests.
          </StateMessage>
        );
      }
      return (
        <StateMessage Icon={GitPullRequest} title="No open pull requests">
          Start an agent on an issue and its PR shows up here.
        </StateMessage>
      );
    }
    return (
      <ul className={styles.panel} style={{ padding: 0 }}>
        {visible.map((pr, index) => (
          <PullRequestRow
            key={prKey(pr)}
            pr={pr}
            index={index}
            now={now}
            fresh={fresh.has(prKey(pr))}
          />
        ))}
      </ul>
    );
  };

  return (
    <WidgetFrame
      id={PULL_REQUESTS_WIDGET_ID}
      title="Pull requests"
      Icon={GitPullRequest}
      count={snapshot ? visible.length : undefined}
      fetchedAt={snapshot?.fetchedAt}
      now={now}
      loading={loading}
      busy={loading && !snapshot}
      onRefresh={refresh}
      index={2}
      tools={tools}
      banner={
        snapshot && failure ? (
          <StaleBanner
            failure={failure}
            fetchedAt={snapshot.fetchedAt}
            now={now}
            onRetry={refresh}
          />
        ) : undefined
      }
    >
      {renderBody()}
    </WidgetFrame>
  );
}
