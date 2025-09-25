/**
 * Core Web Vitals Performance Monitoring
 * Task: T448 - Frontend performance optimization (Core Web Vitals)
 *
 * Implements comprehensive performance monitoring for Core Web Vitals metrics
 * and provides utilities for performance optimization.
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, Metric } from 'web-vitals';

// Performance thresholds based on Core Web Vitals standards
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP)
  LCP: {
    GOOD: 2500,    // <= 2.5s
    NEEDS_IMPROVEMENT: 4000  // <= 4.0s
  },
  // First Input Delay (FID)
  FID: {
    GOOD: 100,     // <= 100ms
    NEEDS_IMPROVEMENT: 300  // <= 300ms
  },
  // Cumulative Layout Shift (CLS)
  CLS: {
    GOOD: 0.1,     // <= 0.1
    NEEDS_IMPROVEMENT: 0.25  // <= 0.25
  },
  // First Contentful Paint (FCP)
  FCP: {
    GOOD: 1800,    // <= 1.8s
    NEEDS_IMPROVEMENT: 3000  // <= 3.0s
  },
  // Time to First Byte (TTFB)
  TTFB: {
    GOOD: 800,     // <= 0.8s
    NEEDS_IMPROVEMENT: 1800  // <= 1.8s
  }
};

export interface PerformanceData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  navigationType?: string;
}

class WebVitalsMonitor {
  private metrics: Map<string, PerformanceData> = new Map();
  private observers: Array<(data: PerformanceData) => void> = [];

  constructor() {
    this.initializeMetricsCollection();
  }

  private initializeMetricsCollection(): void {
    // Only collect metrics in the browser
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    onLCP((metric: Metric) => {
      this.recordMetric('LCP', metric);
    });

    // First Input Delay
    onFID((metric: Metric) => {
      this.recordMetric('FID', metric);
    });

    // Cumulative Layout Shift
    onCLS((metric: Metric) => {
      this.recordMetric('CLS', metric);
    });

    // First Contentful Paint
    onFCP((metric: Metric) => {
      this.recordMetric('FCP', metric);
    });

    // Time to First Byte
    onTTFB((metric: Metric) => {
      this.recordMetric('TTFB', metric);
    });

    // Custom metrics
    this.collectCustomMetrics();
  }

  private recordMetric(metricName: string, metric: Metric): void {
    const rating = this.getRating(metricName, metric.value);

    const performanceData: PerformanceData = {
      metric: metricName,
      value: metric.value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      navigationType: this.getNavigationType()
    };

    this.metrics.set(metricName, performanceData);
    this.notifyObservers(performanceData);

    // Log performance issues
    if (rating !== 'good') {
      console.warn(`Performance Issue Detected - ${metricName}:`, {
        value: metric.value,
        rating,
        threshold: this.getThreshold(metricName),
        url: window.location.href
      });
    }
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.GOOD) return 'good';
    if (value <= thresholds.NEEDS_IMPROVEMENT) return 'needs-improvement';
    return 'poor';
  }

  private getThreshold(metricName: string): { good: number; needsImprovement: number } | null {
    const thresholds = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!thresholds) return null;

    return {
      good: thresholds.GOOD,
      needsImprovement: thresholds.NEEDS_IMPROVEMENT
    };
  }

  private getConnectionType(): string | undefined {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.effectiveType;
  }

  private getNavigationType(): string | undefined {
    if (typeof window === 'undefined') return undefined;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation?.type;
  }

  private collectCustomMetrics(): void {
    // Time to Interactive (TTI) approximation
    const observeTTI = () => {
      let ttiTime = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name === 'tti') {
            ttiTime = entry.startTime;
            this.recordCustomMetric('TTI', ttiTime);
            observer.disconnect();
            break;
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });

      // Fallback: estimate TTI as when main thread is idle
      setTimeout(() => {
        if (ttiTime === 0) {
          const estimate = performance.now();
          this.recordCustomMetric('TTI', estimate);
        }
      }, 5000);
    };

    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordCustomMetric('DCL', performance.now());
      });
    } else {
      // Already loaded
      this.recordCustomMetric('DCL', performance.now());
    }

    // Resource loading performance
    this.monitorResourceLoading();

    observeTTI();
  }

  private recordCustomMetric(name: string, value: number): void {
    const performanceData: PerformanceData = {
      metric: name,
      value,
      rating: 'good', // Custom metrics don't have predefined ratings
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.metrics.set(name, performanceData);
    this.notifyObservers(performanceData);
  }

  private monitorResourceLoading(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;

          // Monitor slow resources
          if (resource.duration > 1000) {
            console.warn('Slow resource detected:', {
              name: resource.name,
              duration: resource.duration,
              size: resource.transferSize,
              type: this.getResourceType(resource.name)
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  private notifyObservers(data: PerformanceData): void {
    this.observers.forEach(observer => {
      try {
        observer(data);
      } catch (error) {
        console.error('Error in performance observer:', error);
      }
    });
  }

  // Public API
  public subscribe(observer: (data: PerformanceData) => void): () => void {
    this.observers.push(observer);

    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  public getMetrics(): Map<string, PerformanceData> {
    return new Map(this.metrics);
  }

  public getMetric(name: string): PerformanceData | undefined {
    return this.metrics.get(name);
  }

  public getPerformanceSummary(): {
    overallRating: 'good' | 'needs-improvement' | 'poor';
    coreWebVitals: Record<string, PerformanceData>;
    recommendations: string[];
  } {
    const coreMetrics = ['LCP', 'FID', 'CLS'];
    const coreWebVitals: Record<string, PerformanceData> = {};
    const ratings: Array<'good' | 'needs-improvement' | 'poor'> = [];
    const recommendations: string[] = [];

    for (const metric of coreMetrics) {
      const data = this.metrics.get(metric);
      if (data) {
        coreWebVitals[metric] = data;
        ratings.push(data.rating);

        // Add specific recommendations
        if (data.rating !== 'good') {
          recommendations.push(...this.getRecommendations(metric, data));
        }
      }
    }

    // Determine overall rating
    const overallRating = ratings.includes('poor') ? 'poor' :
                         ratings.includes('needs-improvement') ? 'needs-improvement' : 'good';

    return {
      overallRating,
      coreWebVitals,
      recommendations
    };
  }

  private getRecommendations(metric: string, data: PerformanceData): string[] {
    const recommendations: string[] = [];

    switch (metric) {
      case 'LCP':
        recommendations.push(
          'Optimize largest contentful element loading',
          'Reduce server response times',
          'Optimize and compress images',
          'Preload key resources',
          'Use a CDN for static assets'
        );
        break;
      case 'FID':
        recommendations.push(
          'Reduce JavaScript execution time',
          'Split long tasks into smaller chunks',
          'Use a web worker for heavy computations',
          'Remove unused JavaScript',
          'Implement lazy loading for non-critical resources'
        );
        break;
      case 'CLS':
        recommendations.push(
          'Add size attributes to images and videos',
          'Reserve space for ads and embeds',
          'Avoid inserting content above existing content',
          'Use transform animations instead of animating layout properties',
          'Preload fonts to avoid FOIT/FOUT'
        );
        break;
      case 'FCP':
        recommendations.push(
          'Eliminate render-blocking resources',
          'Minify CSS and JavaScript',
          'Remove unused CSS',
          'Preconnect to required origins',
          'Optimize server response time'
        );
        break;
      case 'TTFB':
        recommendations.push(
          'Optimize server-side processing',
          'Use a Content Delivery Network (CDN)',
          'Cache resources when possible',
          'Establish early connections to required origins',
          'Use HTTP/2 or HTTP/3'
        );
        break;
    }

    return recommendations;
  }

  public exportMetrics(): string {
    const metrics = Array.from(this.metrics.values());
    return JSON.stringify(metrics, null, 2);
  }
}

// Singleton instance
let webVitalsMonitor: WebVitalsMonitor | null = null;

export const getWebVitalsMonitor = (): WebVitalsMonitor => {
  if (!webVitalsMonitor) {
    webVitalsMonitor = new WebVitalsMonitor();
  }
  return webVitalsMonitor;
};

// Performance utilities
export const performanceUtils = {
  // Measure function execution time
  measureFunction<T extends any[], R>(
    fn: (...args: T) => R,
    name: string
  ): (...args: T) => R {
    return (...args: T): R => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      console.log(`Performance: ${name} took ${(end - start).toFixed(2)}ms`);

      return result;
    };
  },

  // Measure async function execution time
  measureAsyncFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    name: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();

      console.log(`Performance: ${name} took ${(end - start).toFixed(2)}ms`);

      return result;
    };
  },

  // Mark performance milestones
  mark(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(name);
    }
  },

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const latest = entries[entries.length - 1];
      return latest ? latest.duration : null;
    } catch (error) {
      console.error('Error measuring performance:', error);
      return null;
    }
  },

  // Get navigation timing
  getNavigationTiming(): PerformanceNavigationTiming | null {
    if (typeof window === 'undefined') return null;

    const entries = performance.getEntriesByType('navigation');
    return entries.length > 0 ? entries[0] as PerformanceNavigationTiming : null;
  },

  // Check if user prefers reduced motion
  prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Check connection quality
  getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';

    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection) return 'unknown';

    const { effectiveType, downlink } = connection;

    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1.5) {
      return 'slow';
    }

    return 'fast';
  }
};

// React hook for using Web Vitals
export const useWebVitals = () => {
  const monitor = getWebVitalsMonitor();

  return {
    getMetrics: () => monitor.getMetrics(),
    getMetric: (name: string) => monitor.getMetric(name),
    getSummary: () => monitor.getPerformanceSummary(),
    subscribe: (callback: (data: PerformanceData) => void) => monitor.subscribe(callback),
    exportMetrics: () => monitor.exportMetrics()
  };
};