import { performance } from 'perf_hooks'
import { logger } from './logger'
import { sentry } from './sentry'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

export interface DatabaseQueryMetric {
  query: string
  duration: number
  rowCount?: number
  tableName?: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER'
}

export interface APIEndpointMetric {
  method: string
  path: string
  statusCode: number
  duration: number
  requestSize?: number
  responseSize?: number
  userId?: string
}

export interface SystemMetric {
  cpuUsage?: number
  memoryUsage?: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  eventLoopLag?: number
  activeHandles?: number
  activeRequests?: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers = new Map<string, number>()
  private isEnabled: boolean = true
  private maxMetricsInMemory: number = 1000
  private flushInterval: number = 60000 // 1 minute

  constructor() {
    this.isEnabled = process.env.PERFORMANCE_MONITORING_ENABLED !== 'false'

    if (this.isEnabled) {
      this.setupSystemMetricsCollection()
      this.setupPeriodicFlush()
    }
  }

  private setupSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
    }, 30000)
  }

  private setupPeriodicFlush(): void {
    setInterval(() => {
      this.flushMetrics()
    }, this.flushInterval)
  }

  private collectSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      // Memory metrics
      this.addMetric({
        name: 'system_memory_rss',
        value: memoryUsage.rss,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: { type: 'memory' }
      })

      this.addMetric({
        name: 'system_memory_heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: { type: 'memory' }
      })

      this.addMetric({
        name: 'system_memory_heap_total',
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: { type: 'memory' }
      })

      // CPU metrics (converted to percentage)
      this.addMetric({
        name: 'system_cpu_user',
        value: cpuUsage.user / 1000, // Convert microseconds to milliseconds
        unit: 'ms',
        timestamp: Date.now(),
        tags: { type: 'cpu' }
      })

      this.addMetric({
        name: 'system_cpu_system',
        value: cpuUsage.system / 1000,
        unit: 'ms',
        timestamp: Date.now(),
        tags: { type: 'cpu' }
      })

      // Event loop lag (approximate)
      const start = performance.now()
      setImmediate(() => {
        const lag = performance.now() - start
        this.addMetric({
          name: 'system_event_loop_lag',
          value: lag,
          unit: 'ms',
          timestamp: Date.now(),
          tags: { type: 'eventloop' }
        })
      })

    } catch (error) {
      logger.warn('Failed to collect system metrics', error)
    }
  }

  addMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return

    this.metrics.push(metric)

    // Log performance issues
    if (this.shouldLogMetric(metric)) {
      logger.info(`Performance metric: ${metric.name}`, {
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
        metadata: metric.metadata
      })
    }

    // Send to Sentry if it's a performance issue
    if (this.isPerformanceIssue(metric)) {
      sentry.addBreadcrumb({
        message: `Performance issue: ${metric.name} = ${metric.value}${metric.unit}`,
        category: 'performance',
        data: {
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          ...metric.tags
        }
      })
    }

    // Prevent memory leaks
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics.shift()
    }
  }

  private shouldLogMetric(metric: PerformanceMetric): boolean {
    // Log significant performance metrics
    if (metric.name.includes('api_') && metric.value > 1000) return true // API calls > 1s
    if (metric.name.includes('database_') && metric.value > 500) return true // DB queries > 500ms
    if (metric.name.includes('memory_') && metric.value > 100 * 1024 * 1024) return true // > 100MB
    if (metric.name.includes('event_loop_lag') && metric.value > 10) return true // > 10ms lag

    return false
  }

  private isPerformanceIssue(metric: PerformanceMetric): boolean {
    // Define thresholds for performance issues
    if (metric.name.includes('api_') && metric.value > 5000) return true // API calls > 5s
    if (metric.name.includes('database_') && metric.value > 2000) return true // DB queries > 2s
    if (metric.name.includes('event_loop_lag') && metric.value > 50) return true // > 50ms lag

    return false
  }

  startTimer(name: string): void {
    if (!this.isEnabled) return
    this.timers.set(name, performance.now())
  }

  endTimer(name: string, tags?: Record<string, string>, metadata?: Record<string, any>): number {
    if (!this.isEnabled) return 0

    const startTime = this.timers.get(name)
    if (!startTime) {
      logger.warn(`Timer ${name} was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    this.addMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags,
      metadata
    })

    return duration
  }

  trackDatabaseQuery(queryMetric: DatabaseQueryMetric): void {
    if (!this.isEnabled) return

    this.addMetric({
      name: 'database_query_duration',
      value: queryMetric.duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        operation: queryMetric.operation,
        table: queryMetric.tableName || 'unknown'
      },
      metadata: {
        query: queryMetric.query.slice(0, 200), // Truncate long queries
        rowCount: queryMetric.rowCount
      }
    })

    // Log slow queries
    if (queryMetric.duration > 1000) {
      logger.warn('Slow database query detected', {
        duration: queryMetric.duration,
        query: queryMetric.query.slice(0, 200),
        rowCount: queryMetric.rowCount,
        operation: queryMetric.operation
      })
    }
  }

  trackAPIEndpoint(endpointMetric: APIEndpointMetric): void {
    if (!this.isEnabled) return

    this.addMetric({
      name: 'api_endpoint_duration',
      value: endpointMetric.duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        method: endpointMetric.method,
        path: this.sanitizePath(endpointMetric.path),
        status: endpointMetric.statusCode.toString()
      },
      metadata: {
        requestSize: endpointMetric.requestSize,
        responseSize: endpointMetric.responseSize,
        userId: endpointMetric.userId
      }
    })

    // Track request and response sizes
    if (endpointMetric.requestSize) {
      this.addMetric({
        name: 'api_request_size',
        value: endpointMetric.requestSize,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: {
          method: endpointMetric.method,
          path: this.sanitizePath(endpointMetric.path)
        }
      })
    }

    if (endpointMetric.responseSize) {
      this.addMetric({
        name: 'api_response_size',
        value: endpointMetric.responseSize,
        unit: 'bytes',
        timestamp: Date.now(),
        tags: {
          method: endpointMetric.method,
          path: this.sanitizePath(endpointMetric.path)
        }
      })
    }
  }

  private sanitizePath(path: string): string {
    // Replace dynamic segments with placeholders for better aggregation
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-zA-Z0-9-_]{20,}/g, '/:token')
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {}

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
          unit: metric.unit
        }
      }

      const stat = summary[metric.name]
      stat.count++
      stat.sum += metric.value
      stat.min = Math.min(stat.min, metric.value)
      stat.max = Math.max(stat.max, metric.value)
      stat.avg = stat.sum / stat.count
    }

    return summary
  }

  flushMetrics(): void {
    if (!this.isEnabled || this.metrics.length === 0) return

    const summary = this.getMetricsSummary()

    logger.info('Performance metrics summary', {
      metricsCount: this.metrics.length,
      summary: Object.keys(summary).reduce((acc, key) => {
        acc[key] = {
          count: summary[key].count,
          avg: Math.round(summary[key].avg * 100) / 100,
          min: summary[key].min,
          max: summary[key].max,
          unit: summary[key].unit
        }
        return acc
      }, {} as Record<string, any>)
    })

    // Clear metrics after flushing
    this.metrics.length = 0
  }

  // Middleware for Express to automatically track API performance
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      if (!this.isEnabled) return next()

      const startTime = performance.now()
      const originalSend = res.send

      res.send = function(body: any) {
        const duration = performance.now() - startTime

        monitor.trackAPIEndpoint({
          method: req.method,
          path: req.path || req.url,
          statusCode: res.statusCode,
          duration,
          requestSize: req.get('content-length') ? parseInt(req.get('content-length')) : undefined,
          responseSize: body ? Buffer.byteLength(body) : undefined,
          userId: req.user?.id
        })

        return originalSend.call(this, body)
      }

      next()
    }
  }

  // Prisma middleware for database query tracking
  prismaMiddleware() {
    return async (params: any, next: any) => {
      if (!this.isEnabled) return next(params)

      const start = performance.now()
      const result = await next(params)
      const duration = performance.now() - start

      this.trackDatabaseQuery({
        query: `${params.action} ${params.model}`,
        duration,
        operation: params.action.toUpperCase(),
        tableName: params.model,
        rowCount: Array.isArray(result) ? result.length : result ? 1 : 0
      })

      return result
    }
  }

  isEnabled(): boolean {
    return this.isEnabled
  }

  disable(): void {
    this.isEnabled = false
  }

  enable(): void {
    this.isEnabled = true
  }
}

export const monitor = new PerformanceMonitor()

// Utility functions for common performance tracking patterns
export function withPerformanceTracking<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>,
  metadata?: Record<string, any>
): T | Promise<T> {
  monitor.startTimer(name)

  try {
    const result = fn()

    if (result instanceof Promise) {
      return result.finally(() => {
        monitor.endTimer(name, tags, metadata)
      }) as Promise<T>
    } else {
      monitor.endTimer(name, tags, metadata)
      return result
    }
  } catch (error) {
    monitor.endTimer(name, { ...tags, error: 'true' }, metadata)
    throw error
  }
}

export function trackAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  return withPerformanceTracking(name, operation, tags) as Promise<T>
}

export default monitor