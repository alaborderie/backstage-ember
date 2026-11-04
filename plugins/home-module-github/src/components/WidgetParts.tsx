import { useId, type ReactNode } from 'react';
import { githubAuthApiRef, useApi } from '@backstage/core-plugin-api';
import { CircleAlert, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { GithubFailure } from '../api/errors';
import { untilLabel, updatedLabel, ago } from '../logic/time';
import styles from './Home.module.css';

export const ICON = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const;
export const ICON_SM = { size: 15, strokeWidth: 1.75, 'aria-hidden': true } as const;
export const ICON_XS = { size: 13, strokeWidth: 1.75, 'aria-hidden': true } as const;

export function WidgetFrame(props: {
  id: string;
  title: string;
  Icon: LucideIcon;
  count: number | undefined;
  fetchedAt: number | undefined;
  now: number;
  loading: boolean;
  busy: boolean;
  onRefresh: () => void;
  index: number;
  tools?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  const { Icon } = props;
  return (
    <section
      id={props.id}
      className={styles.widget}
      aria-labelledby={headingId}
      style={{ '--i': props.index } as React.CSSProperties}
    >
      <div className={styles.head}>
        <Icon {...ICON} />
        <h2 id={headingId} className={styles.title}>
          {props.title}
        </h2>
        <span className={styles.count} aria-label={props.count === undefined ? 'Loading' : `${props.count} open`}>
          {props.count ?? '…'}
        </span>
        <span className={styles.spacer} />
        <span className={styles.updated} aria-live="off">
          {props.loading ? 'Refreshing…' : updatedLabel(props.fetchedAt, props.now)}
        </span>
        <button
          type="button"
          className={`${styles.iconButton} ${props.loading ? styles.spin : ''}`}
          aria-label={`Refresh ${props.title.toLowerCase()}`}
          onClick={props.onRefresh}
          disabled={props.loading}
        >
          <RefreshCw {...ICON_SM} />
        </button>
      </div>
      {props.tools}
      {props.banner}
      <div className={styles.body} aria-live="polite" aria-busy={props.busy}>
        {props.children}
      </div>
    </section>
  );
}

export function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.skelRow} style={{ opacity: 1 - i * 0.12 }}>
          <div className={styles.skel} style={{ width: 18, height: 18, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div className={styles.skel} style={{ height: 12, width: `${70 - (i % 3) * 14}%` }} />
            <div
              className={styles.skel}
              style={{ height: 10, width: `${34 + (i % 2) * 10}%`, marginTop: 8 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StateMessage(props: {
  Icon: LucideIcon;
  title: string;
  children: ReactNode;
  error?: boolean;
  action?: ReactNode;
}) {
  const { Icon } = props;
  return (
    <div className={`${styles.state} ${props.error ? styles.stateError : ''}`} role={props.error ? 'alert' : undefined}>
      <span className={styles.halo}>
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3>{props.title}</h3>
      <p>{props.children}</p>
      {props.action}
    </div>
  );
}

function describe(failure: GithubFailure, now: number): { title: string; text: ReactNode } {
  switch (failure.kind) {
    case 'rate-limited':
      return {
        title: 'GitHub did not answer',
        text: (
          <>
            The API returned <code>{failure.status} rate limit exceeded</code>.
            {failure.resetAt ? ` It resets ${untilLabel(failure.resetAt, now)}.` : ''}
          </>
        ),
      };
    case 'unauthorized':
      return {
        title: 'Your GitHub session expired',
        text: 'Sign in to GitHub again to refresh it.',
      };
    default:
      return {
        title: 'GitHub did not answer',
        text: (
          <>
            The request failed with <code>{failure.detail}</code>.
          </>
        ),
      };
  }
}

function useRetry(failure: GithubFailure, retry: () => void) {
  const githubAuthApi = useApi(githubAuthApiRef);
  if (failure.kind !== 'unauthorized') return { label: 'Try again', run: retry };
  return {
    label: 'Sign in to GitHub',
    run: () => {
      githubAuthApi
        .getAccessToken([], { instantPopup: true })
        .then(retry)
        .catch(() => undefined);
    },
  };
}

/** The full error state, when there is no cached snapshot to show. */
export function ErrorState({
  failure,
  now,
  onRetry,
}: {
  failure: GithubFailure;
  now: number;
  onRetry: () => void;
}) {
  const { title, text } = describe(failure, now);
  const retry = useRetry(failure, onRetry);
  return (
    <StateMessage
      Icon={TriangleAlert}
      title={title}
      error
      action={
        <button type="button" className={styles.button} onClick={retry.run}>
          <RefreshCw {...ICON_SM} />
          {retry.label}
        </button>
      }
    >
      {text} No cached results yet.
    </StateMessage>
  );
}

/** A refresh failed, but the cached snapshot stays on screen. */
export function StaleBanner({
  failure,
  fetchedAt,
  now,
  onRetry,
}: {
  failure: GithubFailure;
  fetchedAt: number;
  now: number;
  onRetry: () => void;
}) {
  const retry = useRetry(failure, onRetry);
  const reason =
    failure.kind === 'rate-limited'
      ? `Rate limited${failure.resetAt ? `, resets ${untilLabel(failure.resetAt, now)}` : ''}`
      : failure.kind === 'unauthorized'
      ? 'GitHub session expired'
      : 'GitHub did not answer';
  return (
    <div className={styles.banner} role="status">
      <CircleAlert {...ICON_SM} />
      <strong>{reason}</strong>
      <span>· cached {ago(fetchedAt, now)}</span>
      <span className={styles.spacer} />
      <button type="button" className={styles.chip} onClick={retry.run}>
        {retry.label}
      </button>
    </div>
  );
}
