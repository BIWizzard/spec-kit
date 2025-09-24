import { monitoring } from './monitoring'

export interface WebVital {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  id?: string
  entries?: PerformanceEntry[]
}

export interface ResourceMetric {
  name: string
  type: string
  size: number
  duration: number
  startTime: number
}

export interface UserInteractionMetric {
  type: 'click' | 'scroll' | 'input' | 'navigation'
  element?: string
  duration?: number
  timestamp: number
}

class FrontendPerformanceMonitor {
  private isEnabled: boolean = true
  private observer?: PerformanceObserver
  private vitalsReported = new Set<string>()

  constructor() {
    this.isEnabled = typeof window !== 'undefined' &&
                    process.env.NODE_ENV === 'production'

    if (this.isEnabled) {
      this.initializeObservers()
      this.trackUserInteractions()
      this.trackResourceLoading()
    }
  }

  private initializeObservers(): void {
    try {
      // Web Vitals observer
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry)
        }
      })

      // Observe different entry types
      const entryTypes = [
        'navigation',
        'paint',
        'largest-contentful-paint',
        'layout-shift',
        'first-input',
        'resource',
        'measure',
        'mark'
      ]

      entryTypes.forEach(type => {
        try {
          this.observer?.observe({ entryTypes: [type] })
        } catch (error) {
          console.warn(`Performance observer for ${type} not supported`)
        }
      })
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
      this.isEnabled = false
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.trackNavigationTiming(entry as PerformanceNavigationTiming)
        break
      case 'paint':
        this.trackPaintTiming(entry)
        break
      case 'largest-contentful-paint':
        this.trackLCP(entry)
        break
      case 'layout-shift':
        this.trackCLS(entry as any)
        break
      case 'first-input':
        this.trackFID(entry as any)
        break
      case 'resource':
        this.trackResourceTiming(entry as PerformanceResourceTiming)
        break
    }
  }

  private trackNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connect: entry.connectEnd - entry.connectStart,
      ssl_negotiation: entry.connectEnd - entry.secureConnectionStart,
      request_response: entry.responseEnd - entry.requestStart,
      dom_processing: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      dom_ready: entry.domContentLoadedEventEnd - entry.navigationStart,
      page_load: entry.loadEventEnd - entry.navigationStart,
      redirect_time: entry.redirectEnd - entry.redirectStart,
      unload_time: entry.unloadEventEnd - entry.unloadEventStart
    }

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        monitoring.trackPerformance({
          name: `navigation_${name}`,
          duration: value,
          metadata: {
            navigation_type: entry.type,
            redirect_count: entry.redirectCount
          }
        })
      }
    })
  }

  private trackPaintTiming(entry: PerformanceEntry): void {
    const vital: WebVital = {
      name: entry.name === 'first-paint' ? 'FP' : 'FCP',
      value: entry.startTime,
      rating: this.getRating(entry.name, entry.startTime)
    }

    this.reportVital(vital)
  }

  private trackLCP(entry: PerformanceEntry): void {
    const vital: WebVital = {
      name: 'LCP',
      value: entry.startTime,
      rating: this.getRating('largest-contentful-paint', entry.startTime),
      id: (entry as any).id
    }

    this.reportVital(vital)
  }

  private trackFID(entry: any): void {
    const vital: WebVital = {
      name: 'FID',
      value: entry.processingStart - entry.startTime,
      rating: this.getRating('first-input-delay', entry.processingStart - entry.startTime)
    }

    this.reportVital(vital)
  }

  private trackCLS(entry: any): void {
    const vital: WebVital = {
      name: 'CLS',
      value: entry.value,
      rating: this.getRating('cumulative-layout-shift', entry.value)
    }

    this.reportVital(vital)
  }

  private trackResourceTiming(entry: PerformanceResourceTiming): void {
    const resourceMetric: ResourceMetric = {
      name: entry.name,
      type: this.getResourceType(entry),
      size: entry.transferSize || 0,
      duration: entry.responseEnd - entry.requestStart,
      startTime: entry.startTime
    }

    // Track slow resources
    if (resourceMetric.duration > 1000) {
      monitoring.trackEvent({
        name: 'slow_resource',
        properties: {
          resource_url: this.sanitizeURL(resourceMetric.name),
          resource_type: resourceMetric.type,
          duration_ms: resourceMetric.duration,
          size_bytes: resourceMetric.size
        }
      })
    }

    // Track large resources
    if (resourceMetric.size > 500000) { // > 500KB
      monitoring.trackEvent({
        name: 'large_resource',
        properties: {
          resource_url: this.sanitizeURL(resourceMetric.name),
          resource_type: resourceMetric.type,
          size_bytes: resourceMetric.size,
          duration_ms: resourceMetric.duration
        }
      })
    }
  }

  private getResourceType(entry: PerformanceResourceTiming): string {
    const url = entry.name
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font'
    if (url.includes('/api/')) return 'fetch'
    return 'other'
  }

  private sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.origin}${parsed.pathname}`
    } catch {
      return url.split('?')[0]
    }
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      'first-paint': [1800, 3000],
      'first-contentful-paint': [1800, 3000],
      'largest-contentful-paint': [2500, 4000],
      'first-input-delay': [100, 300],
      'cumulative-layout-shift': [0.1, 0.25]
    }

    const [good, poor] = thresholds[metricName] || [0, Infinity]

    if (value <= good) return 'good'
    if (value <= poor) return 'needs-improvement'
    return 'poor'
  }

  private reportVital(vital: WebVital): void {
    const key = `${vital.name}-${vital.id || 'default'}`

    if (this.vitalsReported.has(key)) return
    this.vitalsReported.add(key)

    monitoring.trackEvent({
      name: 'web_vital',
      properties: {
        metric_name: vital.name,
        metric_value: vital.value,
        metric_rating: vital.rating,
        metric_delta: vital.delta || 0
      }
    })
  }

  private trackUserInteractions(): void {
    if (typeof window === 'undefined') return

    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      this.trackInteraction({
        type: 'click',
        element: this.getElementSelector(target),
        timestamp: Date.now()
      })
    })

    // Track scroll performance
    let scrollTimeout: NodeJS.Timeout
    let scrollStart: number

    document.addEventListener('scroll', () => {
      if (!scrollStart) {
        scrollStart = performance.now()
      }

      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const duration = performance.now() - scrollStart
        this.trackInteraction({
          type: 'scroll',
          duration,
          timestamp: Date.now()
        })
        scrollStart = 0
      }, 150)
    })

    // Track input performance
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement
      const startTime = performance.now()

      requestIdleCallback(() => {
        const duration = performance.now() - startTime
        this.trackInteraction({
          type: 'input',
          element: this.getElementSelector(target),
          duration,
          timestamp: Date.now()
        })
      })
    })
  }

  private trackResourceLoading(): void {
    if (typeof window === 'undefined') return

    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      monitoring.trackEvent({
        name: 'resource_error',
        properties: {
          error_message: event.message,
          error_filename: event.filename,
          error_line: event.lineno,
          error_col: event.colno
        }
      })
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      monitoring.trackEvent({
        name: 'unhandled_promise_rejection',
        properties: {
          error_reason: String(event.reason)
        }
      })
    })
  }

  private trackInteraction(interaction: UserInteractionMetric): void {
    if (!this.isEnabled) return

    monitoring.trackEvent({
      name: 'user_interaction',
      properties: {
        interaction_type: interaction.type,
        element_selector: interaction.element,
        duration_ms: interaction.duration || 0,
        timestamp: interaction.timestamp
      }
    })
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ').join('.')}`
    return element.tagName.toLowerCase()
  }

  // Public API
  mark(name: string): void {
    if (this.isEnabled && 'performance' in window) {
      performance.mark(name)
    }
  }

  measure(name: string, startMark?: string, endMark?: string): number {
    if (!this.isEnabled || !('performance' in window)) return 0

    try {
      performance.measure(name, startMark, endMark)
      const entries = performance.getEntriesByName(name, 'measure')
      const latest = entries[entries.length - 1]
      return latest ? latest.duration : 0
    } catch (error) {
      console.warn('Performance measure failed:', error)
      return 0
    }
  }

  trackComponentRender(componentName: string, renderTime: number): void {
    monitoring.trackPerformance({
      name: 'component_render',
      duration: renderTime,
      metadata: {
        component_name: componentName
      }
    })
  }

  trackAPICall(url: string, method: string, duration: number, status: number): void {
    monitoring.trackPerformance({
      name: 'api_call_frontend',
      duration,
      metadata: {
        url: this.sanitizeURL(url),
        method,
        status
      }
    })
  }

  trackRouteChange(from: string, to: string, duration: number): void {
    monitoring.trackEvent({
      name: 'route_change',
      properties: {
        from_route: from,
        to_route: to,
        duration_ms: duration
      }
    })
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.isEnabled = false
  }
}

export const performanceMonitor = new FrontendPerformanceMonitor()

// React hooks for performance monitoring
export function usePerformanceMonitoring() {
  return {
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    trackComponentRender: performanceMonitor.trackComponentRender.bind(performanceMonitor),
    trackAPICall: performanceMonitor.trackAPICall.bind(performanceMonitor),
    trackRouteChange: performanceMonitor.trackRouteChange.bind(performanceMonitor)
  }
}

// Higher-order component for automatic component performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const ComponentWithPerformanceTracking = (props: P) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'

    React.useEffect(() => {
      const startTime = performance.now()

      return () => {
        const renderTime = performance.now() - startTime
        performanceMonitor.trackComponentRender(name, renderTime)
      }
    }, [name])

    return <WrappedComponent {...props} />
  }

  ComponentWithPerformanceTracking.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithPerformanceTracking
}

export default performanceMonitor