/**
 * Shown while a lazily-loaded route chunk arrives.
 *
 * Deliberately quiet — a spinner mid-pitch reads as the app struggling. On a
 * warm cache this is invisible; on the first visit to a section it is a beat.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <span className="h-2 w-2 animate-pulse rounded-full bg-j-primary" aria-hidden="true" />
    </div>
  );
}
