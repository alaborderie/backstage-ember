import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageApiRef, useApi } from '@backstage/core-plugin-api';
import type { JsonValue } from '@backstage/types';
import { STORAGE_BUCKET } from './useGithubData';

/**
 * A per-user preference stored through `storageApiRef`. `parse` rejects
 * stored values of the wrong shape. `undefined` means nothing is stored yet.
 */
export function usePersistentState<T extends JsonValue>(
  key: string,
  parse: (value: unknown) => T | undefined,
): [T | undefined, (value: T) => void] {
  const storageApi = useApi(storageApiRef);
  const storage = useMemo(
    () => storageApi.forBucket(STORAGE_BUCKET),
    [storageApi],
  );
  const [value, setValue] = useState<T | undefined>(() =>
    parse(storage.snapshot(key).value),
  );
  const parseRef = useRef(parse);
  parseRef.current = parse;

  useEffect(() => {
    const subscription = storage.observe$<JsonValue>(key).subscribe(next => {
      setValue(parseRef.current(next.value));
    });
    return () => subscription.unsubscribe();
  }, [storage, key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      storage.set(key, next).catch(() => undefined);
    },
    [storage, key],
  );
  return [value, update];
}

export const parseStringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every(item => typeof item === 'string')
    ? value
    : undefined;
