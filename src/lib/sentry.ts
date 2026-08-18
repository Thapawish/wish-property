import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let initialized = false;

export function initSentry() {
  if (!SENTRY_DSN || initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      const online = navigator.onLine;
      if (!online) {
        (event.tags as Record<string, string>) = { ...(event.tags ?? {}), offline: 'true' };
      }
      return event;
    },
  });
}

export function captureError(error: Error | unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureMessage(String(error), { level: 'error', extra: context });
  }
}

export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export { Sentry };
