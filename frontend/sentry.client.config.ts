import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Performance Monitoring
  enableTracing: true,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) => {
        // Don't create spans for requests to the Sentry DSN
        return !url.startsWith('https://sentry.io/')
      },
    }),
  ],

  // Filtering
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' &&
        process.env.NEXT_PUBLIC_SENTRY_DEBUG !== 'true') {
      return null
    }

    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException

      // Skip network errors and chunk loading errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message
        if (message.includes('ChunkLoadError') ||
            message.includes('Loading chunk') ||
            message.includes('Network request failed')) {
          return null
        }
      }
    }

    return event
  },

  // Configure release information
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Debug settings
  debug: process.env.NODE_ENV === 'development' &&
         process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
})