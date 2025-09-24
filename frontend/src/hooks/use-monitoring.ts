import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { monitoring, MonitoringEvent } from '../lib/monitoring'

export interface UseMonitoringOptions {
  trackPageViews?: boolean
  trackUserActions?: boolean
  trackErrors?: boolean
}

export const useMonitoring = (options: UseMonitoringOptions = {}) => {
  const pathname = usePathname()
  const {
    trackPageViews = true,
    trackUserActions = true,
    trackErrors = true,
  } = options

  useEffect(() => {
    if (trackPageViews && pathname) {
      monitoring.trackPageView(pathname)
    }
  }, [pathname, trackPageViews])

  useEffect(() => {
    if (!trackErrors) return

    const handleError = (event: ErrorEvent) => {
      monitoring.trackError({
        error: new Error(event.message),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          source: 'window.onerror',
        },
        severity: 'high',
      })
    }

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason))

      monitoring.trackError({
        error,
        context: {
          source: 'unhandled-promise-rejection',
        },
        severity: 'high',
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handlePromiseRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handlePromiseRejection)
    }
  }, [trackErrors])

  const trackEvent = useCallback((event: MonitoringEvent) => {
    monitoring.trackEvent(event)
  }, [])

  const trackUserAction = useCallback((action: string, properties?: Record<string, any>) => {
    if (!trackUserActions) return
    monitoring.trackUserAction(action, properties)
  }, [trackUserActions])

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    monitoring.trackError({ error, context })
  }, [])

  const startTimer = useCallback((name: string) => {
    return monitoring.startPerformanceTimer(name)
  }, [])

  const withPerformanceTracking = useCallback(
    <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => {
      return monitoring.withPerformanceTracking(name, fn, metadata)
    },
    []
  )

  return {
    trackEvent,
    trackUserAction,
    trackError,
    startTimer,
    withPerformanceTracking,
    isEnabled: monitoring.isMonitoringEnabled(),
  }
}

export const usePageView = (pageName?: string) => {
  const pathname = usePathname()

  useEffect(() => {
    const page = pageName || pathname
    if (page) {
      monitoring.trackPageView(page, {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      })
    }
  }, [pageName, pathname])
}

export const usePerformanceMonitoring = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming

          monitoring.trackPerformance({
            name: 'page_load',
            duration: navEntry.loadEventEnd - navEntry.loadEventStart,
            metadata: {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              firstPaint: navEntry.responseEnd - navEntry.fetchStart,
              dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcpConnect: navEntry.connectEnd - navEntry.connectStart,
              serverResponse: navEntry.responseEnd - navEntry.requestStart,
            }
          })
        }

        if (entry.entryType === 'paint') {
          monitoring.trackPerformance({
            name: `paint_${entry.name}`,
            duration: entry.startTime,
          })
        }

        if (entry.entryType === 'largest-contentful-paint') {
          monitoring.trackPerformance({
            name: 'largest_contentful_paint',
            duration: entry.startTime,
          })
        }

        if (entry.entryType === 'first-input') {
          const fidEntry = entry as any
          monitoring.trackPerformance({
            name: 'first_input_delay',
            duration: fidEntry.processingStart - fidEntry.startTime,
          })
        }

        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any
          monitoring.trackPerformance({
            name: 'cumulative_layout_shift',
            duration: clsEntry.value,
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] })

      // Try to observe newer metrics if supported
      if ('PerformanceObserver' in window) {
        try {
          observer.observe({ entryTypes: ['first-input'] })
        } catch (e) {
          // first-input not supported
        }

        try {
          observer.observe({ entryTypes: ['layout-shift'] })
        } catch (e) {
          // layout-shift not supported
        }
      }
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }

    return () => {
      observer.disconnect()
    }
  }, [])
}

export default useMonitoring