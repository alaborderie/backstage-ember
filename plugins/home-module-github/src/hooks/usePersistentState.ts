import { useCallback, useEffect, useRef, useState } from 'react';
import type { JsonValue } from '@backstage/types';
import { useUserBucket } from './useUserBucket';

/**
 * A per-user preference stored through `storageApiRef`. `parse` rejects
 * stored values of the wrong shape. `undefined` means nothing is stored yet.
 */
export function usePersistentState<T extends JsonValue>(
  key: string,
  parse: (value: unknown) => T | undefined,
): [T | undefined, (value: T) => void] {
  const storage = useUserBucket();
  const [value, setValue] = useState<T>();
  const parseRef = useRef(parse);
  parseRef.current = parse;

  useEffect(() => {
    if (!storage) return undefined;
    setValue(parseRef.current(storage.snapshot(key).value));
    const subscription = storage.observe$<JsonValue>(key).subscribe(next => {
      setValue(parseRef.current(next.value));
    });
    return () => subscription.unsubscribe();
  }, [storage, key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      storage?.set(key, next).catch(() => undefined);
    },
    [storage, key],
  );
  return [value, update];
}

export const parseStringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every(item => typeof item === 'string')
    ? value
    : undefined;
