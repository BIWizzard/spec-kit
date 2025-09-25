import { test as base } from '@playwright/test';

// Enhanced test fixture for browser compatibility reporting
type BrowserCapabilities = {
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  hasTouch: boolean;
  isMobile: boolean;
  platform: string;
  features: {
    localStorage: boolean;
    sessionStorage: boolean;
    webgl: boolean;
    webgl2: boolean;
    canvas: boolean;
    geolocation: boolean;
    notifications: boolean;
    serviceWorker: boolean;
    webWorker: boolean;
    fetch: boolean;
    websocket: boolean;
    indexedDB: boolean;
    cssGrid: boolean;
    cssFlexbox: boolean;
    cssCustomProperties: boolean;
    es6Modules: boolean;
    asyncAwait: boolean;
  };
  performance: {
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number | null;
    largestContentfulPaint: number | null;
  };
  errors: string[];
  warnings: string[];
};

export const test = base.extend<{ browserCapabilities: BrowserCapabilities }>({
  browserCapabilities: async ({ page }, use) => {
    const capabilities: BrowserCapabilities = {
      userAgent: '',
      viewport: { width: 0, height: 0 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      platform: '',
      features: {
        localStorage: false,
        sessionStorage: false,
        webgl: false,
        webgl2: false,
        canvas: false,
        geolocation: false,
        notifications: false,
        serviceWorker: false,
        webWorker: false,
        fetch: false,
        websocket: false,
        indexedDB: false,
        cssGrid: false,
        cssFlexbox: false,
        cssCustomProperties: false,
        es6Modules: false,
        asyncAwait: false,
      },
      performance: {
        loadTime: 0,
        domContentLoaded: 0,
        firstContentfulPaint: null,
        largestContentfulPaint: null,
      },
      errors: [],
      warnings: [],
    };

    // Collect browser information
    await page.goto('/');

    // Get browser details
    capabilities.userAgent = await page.evaluate(() => navigator.userAgent);
    capabilities.viewport = page.viewportSize() || { width: 0, height: 0 };
    capabilities.deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio);
    capabilities.hasTouch = await page.evaluate(() => 'ontouchstart' in window);
    capabilities.isMobile = await page.evaluate(() => /Mobi|Android/i.test(navigator.userAgent));
    capabilities.platform = await page.evaluate(() => navigator.platform);

    // Feature detection
    capabilities.features = await page.evaluate(() => {
      const features = {
        localStorage: false,
        sessionStorage: false,
        webgl: false,
        webgl2: false,
        canvas: false,
        geolocation: false,
        notifications: false,
        serviceWorker: false,
        webWorker: false,
        fetch: false,
        websocket: false,
        indexedDB: false,
        cssGrid: false,
        cssFlexbox: false,
        cssCustomProperties: false,
        es6Modules: false,
        asyncAwait: false,
      };

      // Test localStorage
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        features.localStorage = true;
      } catch {}

      // Test sessionStorage
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        features.sessionStorage = true;
      } catch {}

      // Test WebGL
      try {
        const canvas = document.createElement('canvas');
        features.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        features.webgl2 = !!canvas.getContext('webgl2');
        features.canvas = !!canvas.getContext('2d');
      } catch {}

      // Test other APIs
      features.geolocation = 'geolocation' in navigator;
      features.notifications = 'Notification' in window;
      features.serviceWorker = 'serviceWorker' in navigator;
      features.webWorker = 'Worker' in window;
      features.fetch = 'fetch' in window;
      features.websocket = 'WebSocket' in window;
      features.indexedDB = 'indexedDB' in window;

      // Test CSS features
      const testDiv = document.createElement('div');
      testDiv.style.display = 'grid';
      features.cssGrid = testDiv.style.display === 'grid';

      testDiv.style.display = 'flex';
      features.cssFlexbox = testDiv.style.display === 'flex';

      testDiv.style.setProperty('--test-var', 'test');
      features.cssCustomProperties = testDiv.style.getPropertyValue('--test-var') === 'test';

      // Test ES6 features
      try {
        eval('const test = () => {}; features.es6Modules = true;');
        eval('async function test() { await Promise.resolve(); } features.asyncAwait = true;');
      } catch {}

      return features;
    });

    // Performance metrics
    const performanceEntries = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
        largestContentfulPaint: null, // Will be captured separately
      };
    });

    capabilities.performance = performanceEntries;

    // Capture LCP if available
    try {
      await page.waitForFunction(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries[entries.length - 1];
            resolve(lcpEntry.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // Timeout after 5 seconds
          setTimeout(() => resolve(null), 5000);
        });
      }, { timeout: 6000 });

      capabilities.performance.largestContentfulPaint = await page.evaluate(() => {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null;
      });
    } catch {
      // LCP not available
    }

    // Collect console errors and warnings
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        capabilities.errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        capabilities.warnings.push(msg.text());
      }
    });

    await use(capabilities);

    // Generate compatibility report after tests
    await generateCompatibilityReport(capabilities, test.info().project.name);
  },
});

async function generateCompatibilityReport(capabilities: BrowserCapabilities, browserName: string) {
  const report = {
    browser: browserName,
    timestamp: new Date().toISOString(),
    userAgent: capabilities.userAgent,
    platform: capabilities.platform,
    viewport: capabilities.viewport,
    deviceScaleFactor: capabilities.deviceScaleFactor,
    hasTouch: capabilities.hasTouch,
    isMobile: capabilities.isMobile,
    features: capabilities.features,
    performance: capabilities.performance,
    errors: capabilities.errors,
    warnings: capabilities.warnings,
    compatibility: {
      score: calculateCompatibilityScore(capabilities),
      issues: identifyCompatibilityIssues(capabilities),
      recommendations: generateRecommendations(capabilities),
    },
  };

  // Save report to file
  const fs = require('fs');
  const path = require('path');

  const reportDir = path.join(process.cwd(), 'test-results', 'compatibility');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFile = path.join(reportDir, `${browserName}-compatibility-report.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`Browser compatibility report saved: ${reportFile}`);
}

function calculateCompatibilityScore(capabilities: BrowserCapabilities): number {
  const featureCount = Object.keys(capabilities.features).length;
  const supportedFeatures = Object.values(capabilities.features).filter(Boolean).length;

  const baseScore = (supportedFeatures / featureCount) * 100;

  // Deduct points for performance issues
  let performancePenalty = 0;
  if (capabilities.performance.loadTime > 3000) performancePenalty += 10;
  if (capabilities.performance.firstContentfulPaint && capabilities.performance.firstContentfulPaint > 2000) {
    performancePenalty += 5;
  }
  if (capabilities.performance.largestContentfulPaint && capabilities.performance.largestContentfulPaint > 4000) {
    performancePenalty += 5;
  }

  // Deduct points for errors
  const errorPenalty = Math.min(capabilities.errors.length * 2, 20);

  return Math.max(0, Math.round(baseScore - performancePenalty - errorPenalty));
}

function identifyCompatibilityIssues(capabilities: BrowserCapabilities): string[] {
  const issues: string[] = [];

  // Critical feature checks
  if (!capabilities.features.localStorage) {
    issues.push('LocalStorage not available - will impact offline functionality');
  }

  if (!capabilities.features.fetch) {
    issues.push('Fetch API not available - may need polyfill');
  }

  if (!capabilities.features.cssGrid) {
    issues.push('CSS Grid not supported - may impact layout');
  }

  if (!capabilities.features.cssFlexbox) {
    issues.push('CSS Flexbox not supported - will significantly impact layout');
  }

  if (!capabilities.features.webgl && !capabilities.features.canvas) {
    issues.push('Neither WebGL nor Canvas supported - charts may not render');
  }

  // Performance issues
  if (capabilities.performance.loadTime > 5000) {
    issues.push('Page load time exceeds 5 seconds - poor user experience');
  }

  if (capabilities.performance.firstContentfulPaint && capabilities.performance.firstContentfulPaint > 3000) {
    issues.push('First Contentful Paint is slow - users may perceive slow loading');
  }

  // Error issues
  if (capabilities.errors.length > 0) {
    const criticalErrors = capabilities.errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('analytics') &&
      !error.includes('tracking')
    );

    if (criticalErrors.length > 0) {
      issues.push(`${criticalErrors.length} JavaScript errors detected`);
    }
  }

  return issues;
}

function generateRecommendations(capabilities: BrowserCapabilities): string[] {
  const recommendations: string[] = [];

  // Feature recommendations
  if (!capabilities.features.fetch) {
    recommendations.push('Add fetch polyfill for older browsers');
  }

  if (!capabilities.features.cssGrid) {
    recommendations.push('Provide CSS Grid fallbacks using Flexbox');
  }

  if (!capabilities.features.localStorage) {
    recommendations.push('Implement cookie-based storage fallback');
  }

  if (!capabilities.features.webgl && capabilities.features.canvas) {
    recommendations.push('Use Canvas 2D fallback for chart rendering');
  } else if (!capabilities.features.canvas) {
    recommendations.push('Consider server-side chart generation for unsupported browsers');
  }

  // Performance recommendations
  if (capabilities.performance.loadTime > 3000) {
    recommendations.push('Optimize bundle size and implement code splitting');
  }

  if (capabilities.isMobile && capabilities.performance.loadTime > 5000) {
    recommendations.push('Implement mobile-specific optimizations and reduced feature set');
  }

  // Mobile-specific recommendations
  if (capabilities.isMobile && !capabilities.features.serviceWorker) {
    recommendations.push('Consider app shell architecture for better mobile performance');
  }

  return recommendations;
}

export { BrowserCapabilities };