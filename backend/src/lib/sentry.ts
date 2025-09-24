import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { captureConsoleIntegration } from '@sentry/integrations'

export interface SentryConfig {
  dsn: string
  environment: string
  release?: string
  sampleRate?: number
  debug?: boolean
  enableProfiling?: boolean
  enableConsoleCapture?: boolean
}

export class SentryService {
  private initialized = false
  private config: SentryConfig

  constructor(config?: Partial<SentryConfig>) {
    this.config = {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.SENTRY_DEBUG === 'true',
      enableProfiling: process.env.SENTRY_PROFILING === 'true',
      enableConsoleCapture: process.env.SENTRY_CONSOLE_CAPTURE === 'true',
      ...config,
    }
  }

  init(): void {
    if (this.initialized || !this.config.dsn) {
      return
    }

    const integrations = [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration(),
      Sentry.prismaIntegration(),
    ]

    if (this.config.enableProfiling) {
      integrations.push(nodeProfilingIntegration())
    }

    if (this.config.enableConsoleCapture) {
      integrations.push(captureConsoleIntegration({ levels: ['error'] }))
    }

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
      tracesSampleRate: this.config.sampleRate,
      profilesSampleRate: this.config.enableProfiling ? this.config.sampleRate : 0,
      debug: this.config.debug,
      enableTracing: true,
      integrations,

      beforeSend(event, hint) {
        // Don't send events in development unless debug is enabled
        if (process.env.NODE_ENV === 'development' && !this.config.debug) {
          return null
        }

        // Add extra context
        if (event.request) {
          event.tags = {
            ...event.tags,
            endpoint: event.request.url,
            method: event.request.method,
          }
        }

        // Filter sensitive data
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
            if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
              // Don't log sensitive URLs
              const url = breadcrumb.data.url as string
              return !url.includes('/auth/') && !url.includes('/password')
            }
            return true
          })
        }

        return event
      },

      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.message) {
          const message = breadcrumb.message.toLowerCase()
          if (message.includes('password') || message.includes('token') || message.includes('secret')) {
            return null
          }
        }

        return breadcrumb
      },
    })

    this.initialized = true
  }

  captureError(error: Error, context?: Record<string, any>): string {
    if (!this.initialized) {
      console.error('Sentry not initialized:', error)
      return ''
    }

    return Sentry.captureException(error, {
      tags: context?.tags,
      user: context?.user,
      extra: context?.extra,
      level: context?.level || 'error',
    })
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): string {
    if (!this.initialized) {
      console.log('Sentry not initialized, message:', message)
      return ''
    }

    return Sentry.captureMessage(message, {
      level,
      tags: context?.tags,
      user: context?.user,
      extra: context?.extra,
    })
  }

  setUser(user: { id: string; email?: string; [key: string]: any }): void {
    if (!this.initialized) return

    Sentry.setUser(user)
  }

  setTag(key: string, value: string): void {
    if (!this.initialized) return

    Sentry.setTag(key, value)
  }

  setContext(key: string, context: Record<string, any>): void {
    if (!this.initialized) return

    Sentry.setContext(key, context)
  }

  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: string; data?: Record<string, any> }): void {
    if (!this.initialized) return

    Sentry.addBreadcrumb(breadcrumb)
  }

  withScope<T>(callback: (scope: Sentry.Scope) => T): T {
    if (!this.initialized) {
      return callback({} as Sentry.Scope)
    }

    return Sentry.withScope(callback)
  }

  startTransaction(name: string, op: string, description?: string): Sentry.Transaction | undefined {
    if (!this.initialized) return undefined

    return Sentry.startTransaction({ name, op, description })
  }

  getCurrentHub(): Sentry.Hub {
    return Sentry.getCurrentHub()
  }

  flush(timeout?: number): Promise<boolean> {
    if (!this.initialized) return Promise.resolve(true)

    return Sentry.flush(timeout)
  }

  close(timeout?: number): Promise<boolean> {
    if (!this.initialized) return Promise.resolve(true)

    return Sentry.close(timeout)
  }

  // Express middleware integration
  requestHandler() {
    if (!this.initialized) {
      return (_req: any, _res: any, next: any) => next()
    }

    return Sentry.Handlers.requestHandler({
      user: ['id', 'email'],
      request: ['method', 'url', 'headers', 'query_string'],
      transaction: 'methodPath',
    })
  }

  tracingHandler() {
    if (!this.initialized) {
      return (_req: any, _res: any, next: any) => next()
    }

    return Sentry.Handlers.tracingHandler()
  }

  errorHandler() {
    if (!this.initialized) {
      return (error: any, _req: any, res: any, next: any) => {
        console.error('Unhandled error:', error)
        next(error)
      }
    }

    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only handle 5xx errors
        return error.status >= 500
      },
    })
  }
}

// Global instance
export const sentry = new SentryService()

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  sentry.init()
}

// Express middleware exports
export const sentryRequestHandler = () => sentry.requestHandler()
export const sentryTracingHandler = () => sentry.tracingHandler()
export const sentryErrorHandler = () => sentry.errorHandler()

// Utility functions
export const captureError = (error: Error, context?: Record<string, any>) =>
  sentry.captureError(error, context)

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>) =>
  sentry.captureMessage(message, level, context)

export const setUser = (user: { id: string; email?: string; [key: string]: any }) =>
  sentry.setUser(user)

export const withSentryScope = <T>(callback: (scope: Sentry.Scope) => T): T =>
  sentry.withScope(callback)

export default sentry