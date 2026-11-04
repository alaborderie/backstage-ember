import { useCallback, useEffect, useRef, useState } from 'react';
import type { JsonValue } from '@backstage/types';
import { toGithubFailure, type GithubFailure } from '../api/errors';
import { useUserBucket } from './useUserBucket';

const STALE_MS = 60_000;
const POLL_MS = 5 * 60_000;

export interface Snapshot<T> {
  items: T[];
  fetchedAt: number;
}

export interface GithubData<T> {
  /** The last good result, from this session or from storage. */
  snapshot?: Snapshot<T>;
  loading: boolean;
  /** Set when the last refresh failed; the snapshot stays visible. */
  failure?: GithubFailure;
  refresh(): void;
}

function parseSnapshot<T>(value: unknown): Snapshot<T> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { items, fetchedAt } = value as Partial<Snapshot<T>>;
  return Array.isArray(items) && typeof fetchedAt === 'number'
    ? { items, fetchedAt }
    : undefined;
}

/**
 * Stale-while-revalidate over `storageApiRef`: paints the stored snapshot at
 * once, then refetches on mount when stale, every 5 minutes, and when the
 * window regains focus. Components that use the same key share updates
 * through the storage observable.
 */
export function useGithubData<T>(
  key: string,
  load: () => Promise<T[]>,
): GithubData<T> {
  const storage = useUserBucket();
  const [snapshot, setSnapshot] = useState<Snapshot<T>>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<GithubFailure>();
  const loadRef = useRef(load);
  loadRef.current = load;
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!storage) return undefined;
    setSnapshot(parseSnapshot<T>(storage.snapshot(key).value));
    setFailure(undefined);
    setLoading(false);
    const subscription = storage.observe$<JsonValue>(key).subscribe(next => {
      const parsed = parseSnapshot<T>(next.value);
      if (parsed) setSnapshot(parsed);
    });
    return () => subscription.unsubscribe();
  }, [storage, key]);

  const refresh = useCallback(async () => {
    if (!storage) return;
    const current = () => keyRef.current === key;
    setLoading(true);
    try {
      const items = await loadRef.current();
      const next = { items, fetchedAt: Date.now() };
      if (current()) {
        setSnapshot(next);
        setFailure(undefined);
      }
      await storage
        .set(key, next as unknown as JsonValue)
        .catch(() => undefined);
    } catch (error) {
      if (current()) setFailure(toGithubFailure(error));
    } finally {
      if (current()) setLoading(false);
    }
  }, [storage, key]);

  useEffect(() => {
    if (!storage) return undefined;
    const refreshIfStale = () => {
      const fetchedAt =
        parseSnapshot<T>(storage.snapshot(key).value)?.fetchedAt ?? 0;
      if (Date.now() - fetchedAt > STALE_MS) refresh();
    };
    refreshIfStale();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    window.addEventListener('focus', refreshIfStale);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshIfStale);
    };
  }, [refresh, storage, key]);

  return { snapshot, loading, failure, refresh };
}
