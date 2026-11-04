import { useEffect, useState } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';

const POLL_MS = 30_000;

function agentList(body: unknown): unknown[] | undefined {
  if (Array.isArray(body)) return body;
  const items =
    body && typeof body === 'object'
      ? (body as { items?: unknown }).items
      : undefined;
  return Array.isArray(items) ? items : undefined;
}

/**
 * Reads the number of agents waiting for the user from a `GET /agents`
 * response. Anything other than a list of agents counts as unknown.
 */
export function countNeedsInput(body: unknown): number | undefined {
  const list = agentList(body);
  if (!list) return undefined;
  return list.filter(
    agent =>
      !agent ||
      typeof agent !== 'object' ||
      !('status' in agent) ||
      (agent as { status: unknown }).status === 'needs_input',
  ).length;
}

/**
 * The cross-repository contract with the cloud-agents plugin: the count of
 * `GET <cloud-agents>/agents?status=needs_input`. It is `undefined` while
 * loading, when the backend is missing (404) or when the call fails.
 */
export function useNeedsYouCount(): number | undefined {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [count, setCount] = useState<number>();

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      try {
        const base = await discoveryApi.getBaseUrl('cloud-agents');
        const response = await fetchApi.fetch(
          `${base}/agents?status=needs_input`,
        );
        if (stopped) return;
        if (response.status === 404) {
          stopped = true;
          setCount(undefined);
          return;
        }
        setCount(
          response.ok ? countNeedsInput(await response.json()) : undefined,
        );
      } catch {
        if (!stopped) setCount(undefined);
      }
      if (!stopped) timer = setTimeout(load, POLL_MS);
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || stopped) return;
      clearTimeout(timer);
      load();
    };

    load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [discoveryApi, fetchApi]);

  return count;
}
