/**
 * Frontend Performance Tests (Playwright E2E)
 * Task: T448 - Frontend performance optimization (Core Web Vitals)
 *
 * Tests Core Web Vitals and frontend performance metrics using Playwright.
 * Validates performance targets across different pages and user flows.
 */

import { test, expect, type Page } from '@playwright/test';

// Performance thresholds based on Core Web Vitals standards
const PERFORMANCE_THRESHOLDS = {
  LCP: { GOOD: 2500, NEEDS_IMPROVEMENT: 4000 },      // Largest Contentful Paint
  FID: { GOOD: 100, NEEDS_IMPROVEMENT: 300 },        // First Input Delay
  CLS: { GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25 },       // Cumulative Layout Shift
  FCP: { GOOD: 1800, NEEDS_IMPROVEMENT: 3000 },      // First Contentful Paint
  TTFB: { GOOD: 800, NEEDS_IMPROVEMENT: 1800 },      // Time to First Byte
  TTI: { GOOD: 3800, NEEDS_IMPROVEMENT: 7300 },      // Time to Interactive
  BUNDLE_SIZE: { GOOD: 200000, NEEDS_IMPROVEMENT: 500000 }, // Bundle size in bytes
  LOAD_TIME: { GOOD: 2000, NEEDS_IMPROVEMENT: 4000 } // Page load time
};

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  tti?: number;
  loadTime: number;
  bundleSize?: number;
  resourceCount: number;
  totalTransferSize: number;
}

test.describe('Frontend Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Collect performance metrics
    await page.addInitScript(() => {
      window.performanceMetrics = [];
    });
  });

  const collectWebVitals = async (page: Page): Promise<Partial<PerformanceMetrics>> => {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: Partial<PerformanceMetrics> = {};
        let collectedCount = 0;
        const targetCount = 5; // LCP, FID, CLS, FCP, TTFB

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime;
              collectedCount++;
            }
            if (entry.entryType === 'first-input') {
              metrics.fid = (entry as any).processingStart - entry.startTime;
              collectedCount++;
            }
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + (entry as any).value;
            }
          }

          if (collectedCount >= targetCount - 2) { // Don't wait for all metrics
            resolve(metrics);
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
          collectedCount++;
        }

        // Get navigation timing for TTFB
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navTiming) {
          metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
          collectedCount++;
        }

        // Fallback timeout
        setTimeout(() => resolve(metrics), 5000);
      });
    });
  };

  const collectResourceMetrics = async (page: Page): Promise<Pick<PerformanceMetrics, 'resourceCount' | 'totalTransferSize'>> => {
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const totalTransferSize = resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);

      return {
        resourceCount: resources.length,
        totalTransferSize
      };
    });
  };

  const measureLoadTime = async (page: Page, url: string): Promise<number> => {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle' });
    return Date.now() - startTime;
  };

  test.describe('Core Pages Performance', () => {
    test('Login page should meet Core Web Vitals targets', async ({ page }) => {
      const loadTime = await measureLoadTime(page, '/login');
      const webVitals = await collectWebVitals(page);
      const resourceMetrics = await collectResourceMetrics(page);

      console.log('Login Page Performance:', { loadTime, ...webVitals, ...resourceMetrics });

      // Load time
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT);

      // Core Web Vitals
      if (webVitals.lcp) {
        expect(webVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.NEEDS_IMPROVEMENT);
      }
      if (webVitals.fcp) {
        expect(webVitals.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP.NEEDS_IMPROVEMENT);
      }
      if (webVitals.cls !== undefined) {
        expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.NEEDS_IMPROVEMENT);
      }
      if (webVitals.ttfb) {
        expect(webVitals.ttfb).toBeLessThan(PERFORMANCE_THRESHOLDS.TTFB.NEEDS_IMPROVEMENT);
      }

      // Resource optimization
      expect(resourceMetrics.resourceCount).toBeLessThan(50); // Reasonable resource count
      expect(resourceMetrics.totalTransferSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.NEEDS_IMPROVEMENT);
    });

    test('Dashboard should load within performance targets', async ({ page }) => {
      // First login to access dashboard
      await page.goto('/login');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.fill('[data-testid=password-input]', 'password123');
      await page.click('[data-testid=login-button]');

      const loadTime = await measureLoadTime(page, '/dashboard');
      const webVitals = await collectWebVitals(page);
      const resourceMetrics = await collectResourceMetrics(page);

      console.log('Dashboard Performance:', { loadTime, ...webVitals, ...resourceMetrics });

      // Dashboard is more complex, so allow slightly higher thresholds
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT * 1.5);

      if (webVitals.lcp) {
        expect(webVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.NEEDS_IMPROVEMENT * 1.2);
      }
      if (webVitals.cls !== undefined) {
        expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.NEEDS_IMPROVEMENT);
      }
    });

    test('Income management page should be performant', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.fill('[data-testid=password-input]', 'password123');
      await page.click('[data-testid=login-button]');

      const loadTime = await measureLoadTime(page, '/income');
      const webVitals = await collectWebVitals(page);

      console.log('Income Page Performance:', { loadTime, ...webVitals });

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT);

      if (webVitals.lcp) {
        expect(webVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.NEEDS_IMPROVEMENT);
      }
    });

    test('Reports page should handle complex data efficiently', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.fill('[data-testid=password-input]', 'password123');
      await page.click('[data-testid=login-button]');

      const loadTime = await measureLoadTime(page, '/reports');
      const webVitals = await collectWebVitals(page);

      console.log('Reports Page Performance:', { loadTime, ...webVitals });

      // Reports page may have more complex calculations
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT * 2);

      if (webVitals.cls !== undefined) {
        expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.NEEDS_IMPROVEMENT);
      }
    });
  });

  test.describe('Interactive Performance', () => {
    test('Form interactions should be responsive', async ({ page }) => {
      await page.goto('/login');

      // Measure form input responsiveness
      const startTime = Date.now();
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.fill('[data-testid=password-input]', 'password123');
      const inputTime = Date.now() - startTime;

      expect(inputTime).toBeLessThan(500); // Form inputs should be responsive

      // Measure button click response
      const clickStartTime = Date.now();
      await page.click('[data-testid=login-button]');
      await page.waitForLoadState('networkidle');
      const clickResponseTime = Date.now() - clickStartTime;

      expect(clickResponseTime).toBeLessThan(5000); // Button click should respond within 5s
    });

    test('Navigation should be fast', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.fill('[data-testid=password-input]', 'password123');
      await page.click('[data-testid=login-button]');

      // Test navigation between pages
      const navigationTimes: number[] = [];

      const testNavigation = async (selector: string, expectedUrl: string) => {
        const startTime = Date.now();
        await page.click(selector);
        await page.waitForURL(expectedUrl);
        navigationTimes.push(Date.now() - startTime);
      };

      // Test multiple navigation routes
      await testNavigation('[data-testid=nav-income]', '/income');
      await testNavigation('[data-testid=nav-payments]', '/payments');
      await testNavigation('[data-testid=nav-dashboard]', '/dashboard');

      // All navigation should be under 2 seconds
      navigationTimes.forEach(time => {
        expect(time).toBeLessThan(2000);
      });

      const avgNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      console.log('Average Navigation Time:', avgNavigationTime);
      expect(avgNavigationTime).toBeLessThan(1000); // Average should be under 1 second
    });
  });

  test.describe('Resource Optimization', () => {
    test('Should use efficient image loading', async ({ page }) => {
      await page.goto('/dashboard');

      const imageMetrics = await page.evaluate(() => {
        const images = Array.from(document.images);
        return {
          totalImages: images.length,
          lazyImages: images.filter(img => img.loading === 'lazy').length,
          optimizedFormats: images.filter(img =>
            img.src.includes('.webp') || img.src.includes('.avif')
          ).length
        };
      });

      console.log('Image Optimization Metrics:', imageMetrics);

      // Most images should be lazy loaded
      if (imageMetrics.totalImages > 0) {
        const lazyPercentage = imageMetrics.lazyImages / imageMetrics.totalImages;
        expect(lazyPercentage).toBeGreaterThan(0.7); // 70% should be lazy loaded
      }
    });

    test('Should minimize JavaScript bundle size', async ({ page }) => {
      await page.goto('/login');

      const bundleAnalysis = await page.evaluate(() => {
        const scriptTags = Array.from(document.scripts);
        const jsResources = performance.getEntriesByType('resource')
          .filter(resource => resource.name.includes('.js'));

        const totalJSSize = jsResources.reduce((sum, resource) =>
          sum + ((resource as PerformanceResourceTiming).transferSize || 0), 0
        );

        return {
          scriptCount: scriptTags.length,
          totalJSSize,
          jsResources: jsResources.length
        };
      });

      console.log('Bundle Analysis:', bundleAnalysis);

      // Total JS size should be reasonable
      expect(bundleAnalysis.totalJSSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.NEEDS_IMPROVEMENT);

      // Don't load too many separate JS files
      expect(bundleAnalysis.jsResources).toBeLessThan(15);
    });

    test('Should use effective caching', async ({ page }) => {
      await page.goto('/login');

      // Check cache headers for static assets
      const cacheAnalysis = await page.evaluate(() => {
        const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const cachedResources = resourceEntries.filter(entry =>
          entry.transferSize === 0 && entry.decodedBodySize > 0 // Served from cache
        );

        return {
          totalResources: resourceEntries.length,
          cachedResources: cachedResources.length,
          cacheHitRate: cachedResources.length / resourceEntries.length
        };
      });

      console.log('Cache Analysis:', cacheAnalysis);

      // On subsequent loads, should have reasonable cache hit rate
      // This test may need to run twice to see caching effects
      if (cacheAnalysis.totalResources > 0) {
        expect(cacheAnalysis.cacheHitRate).toBeGreaterThan(0.1); // At least 10% from cache
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

    test('Should perform well on mobile devices', async ({ page }) => {
      const loadTime = await measureLoadTime(page, '/login');
      const webVitals = await collectWebVitals(page);

      console.log('Mobile Performance:', { loadTime, ...webVitals });

      // Mobile should have slightly higher thresholds
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT * 1.5);

      if (webVitals.lcp) {
        expect(webVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.NEEDS_IMPROVEMENT * 1.3);
      }
      if (webVitals.cls !== undefined) {
        expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.NEEDS_IMPROVEMENT);
      }
    });

    test('Touch interactions should be responsive on mobile', async ({ page }) => {
      await page.goto('/login');

      // Test touch interaction timing
      const startTime = Date.now();
      await page.tap('[data-testid=email-input]');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      const touchResponseTime = Date.now() - startTime;

      expect(touchResponseTime).toBeLessThan(300); // Should meet mobile touch standards
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('Should maintain performance baselines', async ({ page }) => {
      const pages = ['/login', '/dashboard', '/income', '/payments'];
      const performanceResults: Array<{ page: string; loadTime: number; lcp?: number }> = [];

      for (const pageUrl of pages) {
        if (pageUrl !== '/login') {
          // Login first for protected pages
          await page.goto('/login');
          await page.fill('[data-testid=email-input]', 'test@example.com');
          await page.fill('[data-testid=password-input]', 'password123');
          await page.click('[data-testid=login-button]');
        }

        const loadTime = await measureLoadTime(page, pageUrl);
        const webVitals = await collectWebVitals(page);

        performanceResults.push({
          page: pageUrl,
          loadTime,
          lcp: webVitals.lcp
        });
      }

      console.log('Performance Baselines:', performanceResults);

      // All pages should meet basic performance requirements
      performanceResults.forEach(result => {
        expect(result.loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT);

        if (result.lcp) {
          expect(result.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP.NEEDS_IMPROVEMENT);
        }
      });

      // Calculate performance consistency
      const loadTimes = performanceResults.map(r => r.loadTime);
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);

      // Performance should be consistent (max shouldn't be too much higher than average)
      expect(maxLoadTime).toBeLessThan(avgLoadTime * 2);
    });
  });

  test.describe('Accessibility Performance', () => {
    test('Should maintain performance with accessibility features', async ({ page }) => {
      // Test with high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });

      const loadTime = await measureLoadTime(page, '/login');
      const webVitals = await collectWebVitals(page);

      console.log('Accessibility Mode Performance:', { loadTime, ...webVitals });

      // Performance should remain good even with accessibility features
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT);

      if (webVitals.cls !== undefined) {
        expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS.NEEDS_IMPROVEMENT);
      }
    });

    test('Should work well with reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const loadTime = await measureLoadTime(page, '/dashboard');

      // Should still load quickly with reduced animations
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME.NEEDS_IMPROVEMENT);
    });
  });
});