import { useEffect, useMemo, useState } from 'react';
import {
  identityApiRef,
  storageApiRef,
  useApi,
  type StorageApi,
} from '@backstage/core-plugin-api';

export const STORAGE_BUCKET = 'home.github';

/**
 * The widgets' storage bucket for the signed-in user. Browser storage is
 * shared by everyone using the browser, so cached issues and preferences
 * live under the user's entity ref. Undefined until the identity resolves.
 */
export function useUserBucket(): StorageApi | undefined {
  const storageApi = useApi(storageApiRef);
  const identityApi = useApi(identityApiRef);
  const [user, setUser] = useState<string>();
  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then(identity => {
        if (active) setUser(identity.userEntityRef);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [identityApi]);
  return useMemo(
    () =>
      user ? storageApi.forBucket(STORAGE_BUCKET).forBucket(user) : undefined,
    [storageApi, user],
  );
}
