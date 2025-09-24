import { track } from '@vercel/analytics'

export interface MonitoringEvent {
  name: string
  properties?: Record<string, string | number | boolean>
  timestamp?: Date
}

export interface ErrorEvent {
  error: Error
  context?: Record<string, any>
  userId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface PerformanceEvent {
  name: string
  duration: number
  metadata?: Record<string, any>
}

class MonitoringService {
  private isEnabled: boolean = false
  private environment: string = 'development'

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    this.environment = process.env.NODE_ENV || 'development'
  }

  trackEvent(event: MonitoringEvent): void {
    if (!this.isEnabled) {
      console.log('[Monitoring] Event:', event)
      return
    }

    try {
      track(event.name, event.properties)
    } catch (error) {
      console.error('[Monitoring] Failed to track event:', error)
    }
  }

  trackError(errorEvent: ErrorEvent): void {
    const { error, context, userId, severity = 'medium' } = errorEvent

    const event: MonitoringEvent = {
      name: 'error_occurred',
      properties: {
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack?.slice(0, 1000) || '',
        severity,
        user_id: userId || 'anonymous',
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        timestamp: Date.now(),
        ...context,
      },
      timestamp: new Date(),
    }

    this.trackEvent(event)
  }

  trackPerformance(performanceEvent: PerformanceEvent): void {
    const { name, duration, metadata } = performanceEvent

    const event: MonitoringEvent = {
      name: 'performance_metric',
      properties: {
        metric_name: name,
        duration_ms: duration,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        ...metadata,
      },
      timestamp: new Date(),
    }

    this.trackEvent(event)
  }

  trackUserAction(action: string, properties?: Record<string, any>): void {
    const event: MonitoringEvent = {
      name: 'user_action',
      properties: {
        action,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: Date.now(),
        ...properties,
      },
      timestamp: new Date(),
    }

    this.trackEvent(event)
  }

  trackAPICall(
    endpoint: string,
    method: string,
    status: number,
    duration: number,
    error?: Error
  ): void {
    const event: MonitoringEvent = {
      name: 'api_call',
      properties: {
        endpoint,
        method,
        status,
        duration_ms: duration,
        success: status >= 200 && status < 300,
        error_message: error?.message || null,
      },
      timestamp: new Date(),
    }

    this.trackEvent(event)
  }

  trackPageView(page: string, properties?: Record<string, any>): void {
    const event: MonitoringEvent = {
      name: 'page_view',
      properties: {
        page,
        referrer: typeof window !== 'undefined' ? document.referrer : '',
        timestamp: Date.now(),
        ...properties,
      },
      timestamp: new Date(),
    }

    this.trackEvent(event)
  }

  startPerformanceTimer(name: string): () => void {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      this.trackPerformance({ name, duration })
    }
  }

  withPerformanceTracking<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now()

    return fn().finally(() => {
      const duration = performance.now() - startTime
      this.trackPerformance({ name, duration, metadata })
    })
  }

  captureException(error: Error, context?: Record<string, any>): void {
    this.trackError({
      error,
      context,
      severity: 'high',
    })
  }

  setEnvironment(env: string): void {
    this.environment = env
  }

  getEnvironment(): string {
    return this.environment
  }

  isMonitoringEnabled(): boolean {
    return this.isEnabled
  }
}

export const monitoring = new MonitoringService()

export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)

      if (result instanceof Promise) {
        return result.catch((error) => {
          monitoring.trackError({ error, context })
          throw error
        })
      }

      return result
    } catch (error) {
      monitoring.trackError({
        error: error instanceof Error ? error : new Error(String(error)),
        context
      })
      throw error
    }
  }) as T
}

export const trackAsyncOperation = async <T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  return monitoring.withPerformanceTracking(name, operation, metadata)
}