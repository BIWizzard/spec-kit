import * as Sentry from '@sentry/nextjs'

export interface ErrorBoundaryOptions {
  fallback?: React.ComponentType<any>
  beforeCapture?: (scope: Sentry.Scope) => void
  showDialog?: boolean
}

export interface SentryUser {
  id: string
  email?: string
  username?: string
  [key: string]: any
}

export class SentryClient {
  static captureError(error: Error, context?: Record<string, any>): string {
    return Sentry.captureException(error, {
      tags: context?.tags,
      user: context?.user,
      extra: context?.extra,
      level: context?.level || 'error',
    })
  }

  static captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, any>
  ): string {
    return Sentry.captureMessage(message, {
      level,
      tags: context?.tags,
      user: context?.user,
      extra: context?.extra,
    })
  }

  static setUser(user: SentryUser): void {
    Sentry.setUser(user)
  }

  static setTag(key: string, value: string): void {
    Sentry.setTag(key, value)
  }

  static setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context)
  }

  static addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: Sentry.SeverityLevel
    data?: Record<string, any>
  }): void {
    Sentry.addBreadcrumb(breadcrumb)
  }

  static withScope<T>(callback: (scope: Sentry.Scope) => T): T {
    return Sentry.withScope(callback)
  }

  static startSpan<T>(
    context: Sentry.StartSpanOptions,
    callback: (span: Sentry.Span | undefined) => T
  ): T {
    return Sentry.startSpan(context, callback)
  }

  static startTransaction(name: string, op: string): Sentry.Transaction | undefined {
    return Sentry.startTransaction({ name, op })
  }

  static configureScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.configureScope(callback)
  }

  static showReportDialog(options?: Sentry.ReportDialogOptions): void {
    Sentry.showReportDialog(options)
  }

  static flush(timeout?: number): Promise<boolean> {
    return Sentry.flush(timeout)
  }

  // React-specific utilities
  static ErrorBoundary = Sentry.ErrorBoundary

  static createErrorBoundary(options?: ErrorBoundaryOptions) {
    return function SentryErrorBoundary({ children }: { children: React.ReactNode }) {
      return (
        <Sentry.ErrorBoundary
          fallback={options?.fallback}
          beforeCapture={options?.beforeCapture}
          showDialog={options?.showDialog}
        >
          {children}
        </Sentry.ErrorBoundary>
      )
    }
  }

  // Performance monitoring
  static trackPageLoad(pageName: string): void {
    this.addBreadcrumb({
      message: `Page loaded: ${pageName}`,
      category: 'navigation',
      level: 'info',
      data: { page: pageName }
    })
  }

  static trackUserAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `User action: ${action}`,
      category: 'user',
      level: 'info',
      data
    })
  }

  static trackAPICall(
    endpoint: string,
    method: string,
    status: number,
    duration?: number,
    error?: Error
  ): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warning' : 'info'

    this.addBreadcrumb({
      message: `API ${method} ${endpoint} - ${status}`,
      category: 'http',
      level,
      data: {
        endpoint,
        method,
        status,
        duration,
        error: error?.message
      }
    })

    if (error) {
      this.captureError(error, {
        tags: {
          endpoint,
          method,
          status: status.toString()
        },
        extra: { duration }
      })
    }
  }

  static trackFormError(formName: string, fieldName: string, error: string): void {
    this.captureMessage(`Form validation error in ${formName}: ${fieldName}`, 'warning', {
      tags: {
        formName,
        fieldName
      },
      extra: { error }
    })
  }

  static trackPerformanceMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, string>
  ): void {
    this.addBreadcrumb({
      message: `Performance: ${name} = ${value}${unit}`,
      category: 'performance',
      level: 'info',
      data: { name, value, unit, ...tags }
    })
  }

  static trackFeatureUsage(feature: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `Feature used: ${feature}`,
      category: 'feature',
      level: 'info',
      data
    })
  }

  static trackSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const level = severity === 'critical' ? 'fatal' :
                 severity === 'high' ? 'error' :
                 severity === 'medium' ? 'warning' : 'info'

    this.captureMessage(`Security event: ${event}`, level as Sentry.SeverityLevel, {
      tags: {
        security: 'true',
        severity
      }
    })
  }
}

// Error boundary component with custom fallback
export function createErrorFallback(message?: string) {
  return function ErrorFallback({ error, resetError }: any) {
    return (
      <div role="alert" className="error-boundary">
        <h2>Something went wrong</h2>
        <p>{message || 'An unexpected error occurred. Please try refreshing the page.'}</p>
        {process.env.NODE_ENV === 'development' && (
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            <summary>Error details (dev only)</summary>
            {error.message}
            {error.stack}
          </details>
        )}
        <button onClick={resetError} style={{ marginTop: '1rem' }}>
          Try again
        </button>
      </div>
    )
  }
}

// Higher-order component for error tracking
export function withErrorTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ComponentWithErrorTracking = (props: P) => {
    const ErrorBoundary = SentryClient.createErrorBoundary({
      fallback: createErrorFallback(`Error in ${componentName || WrappedComponent.name}`),
      beforeCapture: (scope) => {
        scope.setTag('component', componentName || WrappedComponent.name || 'Unknown')
      }
    })

    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  ComponentWithErrorTracking.displayName = `withErrorTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithErrorTracking
}

// React hook for Sentry integration
export function useSentry() {
  return {
    captureError: SentryClient.captureError,
    captureMessage: SentryClient.captureMessage,
    setUser: SentryClient.setUser,
    trackUserAction: SentryClient.trackUserAction,
    trackAPICall: SentryClient.trackAPICall,
    trackFormError: SentryClient.trackFormError,
    trackPerformanceMetric: SentryClient.trackPerformanceMetric,
    trackFeatureUsage: SentryClient.trackFeatureUsage,
    showReportDialog: SentryClient.showReportDialog,
    withScope: SentryClient.withScope,
  }
}

export { SentryClient }
export default SentryClient