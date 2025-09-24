import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Performance Monitoring
  enableTracing: true,

  integrations: [
    Sentry.nodeProfilingIntegration(),
    Sentry.httpIntegration({ tracing: true }),
    Sentry.prismaIntegration(),
  ],

  // Filtering
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' &&
        process.env.SENTRY_DEBUG !== 'true') {
      return null
    }

    return event
  },

  beforeSendTransaction(event) {
    // Don't send transactions in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' &&
        process.env.SENTRY_DEBUG !== 'true') {
      return null
    }

    return event
  },

  // Configure release information
  release: process.env.APP_VERSION,

  // Debug settings
  debug: process.env.NODE_ENV === 'development' &&
         process.env.SENTRY_DEBUG === 'true',

  // Shutdown timeout
  shutdownTimeout: 2000,
})