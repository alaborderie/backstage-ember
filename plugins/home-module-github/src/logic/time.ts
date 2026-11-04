/** Compact relative age, as GitHub lists show it: `5m ago`, `3d ago`. */
export function ago(iso: string | number, now: number): string {
  const then = typeof iso === 'number' ? iso : Date.parse(iso);
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

/** "Updated 2 min ago", for the widget header. */
export function updatedLabel(
  fetchedAt: number | undefined,
  now: number,
): string {
  if (fetchedAt === undefined) return 'Not loaded yet';
  const minutes = Math.floor((now - fetchedAt) / 60_000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} h ago`;
  return `Updated ${Math.floor(hours / 24)} d ago`;
}

/** "in 11 minutes", for a rate-limit reset. */
export function untilLabel(at: number, now: number): string {
  const minutes = Math.max(1, Math.ceil((at - now) / 60_000));
  return minutes < 60
    ? `in ${minutes} minute${minutes === 1 ? '' : 's'}`
    : `in ${Math.ceil(minutes / 60)} h`;
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
