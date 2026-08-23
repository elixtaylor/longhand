export const RECOVERABLE_ERROR_EVENT = 'longhand:recoverable-error';

/** Ask the application shell to show its small non-blocking recovery notice. */
export function notifyRecoverableError(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(RECOVERABLE_ERROR_EVENT));
}
