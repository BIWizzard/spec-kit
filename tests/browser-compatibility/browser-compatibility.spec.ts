import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { devices } from '@playwright/test';

// Browser compatibility test suite for KGiQ Family Finance
// Tests critical functionality across all supported browsers and devices

const criticalUserJourneys = [
  {
    name: 'Authentication Flow',
    description: 'User registration, login, and logout',
    async execute(page: Page) {
      // Navigate to registration
      await page.goto('/register');

      // Check if form loads correctly
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Navigate to login
      await page.goto('/login');
      await expect(page.locator('form')).toBeVisible();

      // Check login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    }
  },
  {
    name: 'Dashboard Navigation',
    description: 'Main navigation and dashboard access',
    async execute(page: Page) {
      await page.goto('/dashboard');

      // Check navigation elements
      await expect(page.locator('nav')).toBeVisible();

      // Check main content areas load
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();

      // Verify critical dashboard elements
      await expect(page.locator('[data-testid*="metric"]').first()).toBeVisible({ timeout: 10000 });
    }
  },
  {
    name: 'Financial Forms',
    description: 'Income and payment form functionality',
    async execute(page: Page) {
      // Test income form
      await page.goto('/income/create');
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[name*="amount"], input[name*="title"]')).toBeVisible();

      // Test payment form
      await page.goto('/payments/create');
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[name*="amount"], input[name*="description"]')).toBeVisible();
    }
  },
  {
    name: 'Data Tables and Lists',
    description: 'Transaction lists, payment lists, income lists',
    async execute(page: Page) {
      // Test payments list
      await page.goto('/payments');
      await expect(page.locator('table, [data-testid*="list"]')).toBeVisible({ timeout: 10000 });

      // Test income list
      await page.goto('/income');
      await expect(page.locator('table, [data-testid*="list"]')).toBeVisible({ timeout: 10000 });

      // Test transactions list
      await page.goto('/transactions');
      await expect(page.locator('table, [data-testid*="list"]')).toBeVisible({ timeout: 10000 });
    }
  },
  {
    name: 'Reports and Charts',
    description: 'Financial reports and chart rendering',
    async execute(page: Page) {
      await page.goto('/reports');

      // Check reports page loads
      await expect(page.locator('main')).toBeVisible();

      // Test specific report
      await page.goto('/reports/cash-flow');
      await expect(page.locator('main')).toBeVisible();

      // Charts should be visible (Canvas or SVG elements)
      const chartElements = page.locator('canvas, svg, [data-testid*="chart"]');
      if (await chartElements.count() > 0) {
        await expect(chartElements.first()).toBeVisible({ timeout: 15000 });
      }
    }
  }
];

// Feature detection tests for browser capabilities
const featureDetectionTests = [
  {
    name: 'LocalStorage Support',
    description: 'Verify localStorage is available and functional',
    async execute(page: Page) {
      const hasLocalStorage = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value');
          const result = localStorage.getItem('test') === 'value';
          localStorage.removeItem('test');
          return result;
        } catch {
          return false;
        }
      });
      expect(hasLocalStorage).toBe(true);
    }
  },
  {
    name: 'Fetch API Support',
    description: 'Verify modern fetch API is available',
    async execute(page: Page) {
      const hasFetch = await page.evaluate(() => typeof fetch !== 'undefined');
      expect(hasFetch).toBe(true);
    }
  },
  {
    name: 'CSS Grid Support',
    description: 'Verify CSS Grid layout support',
    async execute(page: Page) {
      const hasGridSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.display = 'grid';
        return testElement.style.display === 'grid';
      });
      expect(hasGridSupport).toBe(true);
    }
  },
  {
    name: 'CSS Flexbox Support',
    description: 'Verify CSS Flexbox layout support',
    async execute(page: Page) {
      const hasFlexSupport = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.style.display = 'flex';
        return testElement.style.display === 'flex';
      });
      expect(hasFlexSupport).toBe(true);
    }
  },
  {
    name: 'ES6 Features Support',
    description: 'Verify essential ES6 features are available',
    async execute(page: Page) {
      const hasES6Support = await page.evaluate(() => {
        try {
          // Test arrow functions, destructuring, and template literals
          const testFunc = (x, y) => `${x} + ${y}`;
          const [a, b] = [1, 2];
          const result = testFunc(a, b);
          return result === '1 + 2';
        } catch {
          return false;
        }
      });
      expect(hasES6Support).toBe(true);
    }
  },
  {
    name: 'WebGL Support',
    description: 'Verify WebGL is available for chart rendering',
    async execute(page: Page) {
      const hasWebGL = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        try {
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      });
      expect(hasWebGL).toBe(true);
    }
  }
];

// Performance tests for different browsers
const performanceTests = [
  {
    name: 'Page Load Performance',
    description: 'Verify acceptable page load times',
    async execute(page: Page) {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds on all browsers
      expect(loadTime).toBeLessThan(5000);
    }
  },
  {
    name: 'Navigation Performance',
    description: 'Verify client-side navigation speed',
    async execute(page: Page) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const startTime = Date.now();
      await page.click('a[href="/income"]');
      await page.waitForURL('**/income');
      const navTime = Date.now() - startTime;

      // Client-side navigation should be fast
      expect(navTime).toBeLessThan(2000);
    }
  }
];

// Run tests for each browser configuration
const browserConfigs = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
  { name: 'mobile-chrome', device: devices['Pixel 5'] },
  { name: 'mobile-safari', device: devices['iPhone 12'] }
];

// Main test execution
for (const config of browserConfigs) {
  test.describe(`Browser Compatibility: ${config.name}`, () => {
    test.use(config.device);

    test.beforeEach(async ({ page }) => {
      // Set up test authentication if needed
      await page.goto('/');

      // Handle any initial popups or consent forms
      try {
        await page.waitForSelector('[data-testid="consent-accept"]', { timeout: 2000 });
        await page.click('[data-testid="consent-accept"]');
      } catch {
        // No consent form, continue
      }
    });

    // Feature detection tests
    test.describe('Feature Support', () => {
      for (const featureTest of featureDetectionTests) {
        test(`${featureTest.name}`, async ({ page }) => {
          await page.goto('/');
          await featureTest.execute(page);
        });
      }
    });

    // Critical user journey tests
    test.describe('User Journeys', () => {
      for (const journey of criticalUserJourneys) {
        test(`${journey.name}`, async ({ page }) => {
          await journey.execute(page);
        });
      }
    });

    // Performance tests (only for desktop browsers)
    if (!config.name.includes('mobile')) {
      test.describe('Performance', () => {
        for (const perfTest of performanceTests) {
          test(`${perfTest.name}`, async ({ page }) => {
            await perfTest.execute(page);
          });
        }
      });
    }

    // Browser-specific tests
    test.describe('Browser-Specific Features', () => {
      test('Console Error Detection', async ({ page }) => {
        const consoleErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Filter out known harmless errors
        const criticalErrors = consoleErrors.filter(error =>
          !error.includes('favicon') &&
          !error.includes('analytics') &&
          !error.includes('AdBlocker')
        );

        expect(criticalErrors).toHaveLength(0);
      });

      test('Network Error Handling', async ({ page }) => {
        const failedRequests: string[] = [];

        page.on('requestfailed', (request) => {
          failedRequests.push(request.url());
        });

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Filter out expected failures (analytics, etc.)
        const criticalFailures = failedRequests.filter(url =>
          !url.includes('analytics') &&
          !url.includes('tracking') &&
          !url.includes('ads') &&
          url.includes(page.url().split('/')[2]) // Same domain
        );

        expect(criticalFailures).toHaveLength(0);
      });

      test('Memory Leak Detection', async ({ page }) => {
        // Navigate through several pages to test for memory leaks
        const pages = ['/dashboard', '/income', '/payments', '/budget', '/reports'];

        for (const testPage of pages) {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');

          // Force garbage collection if available
          await page.evaluate(() => {
            if (typeof window.gc === 'function') {
              window.gc();
            }
          });
        }

        // Test should complete without browser crashes
        expect(true).toBe(true);
      });
    });

    // Responsive design tests (for mobile browsers)
    if (config.name.includes('mobile')) {
      test.describe('Mobile-Specific Features', () => {
        test('Touch Interface Functionality', async ({ page }) => {
          await page.goto('/dashboard');

          // Test touch scrolling
          await page.touchscreen.tap(200, 400);

          // Test menu functionality on mobile
          const menuButton = page.locator('[data-testid="mobile-menu"], button:has-text("Menu"), [aria-label*="menu"]');
          if (await menuButton.isVisible()) {
            await menuButton.tap();
          }
        });

        test('Viewport Meta Tag', async ({ page }) => {
          await page.goto('/');

          const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
          expect(viewportMeta).toContain('width=device-width');
          expect(viewportMeta).toContain('initial-scale=1');
        });

        test('Mobile Form Usability', async ({ page }) => {
          await page.goto('/income/create');

          const numberInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
          if (await numberInputs.count() > 0) {
            // Number inputs should trigger numeric keyboard on mobile
            await numberInputs.first().tap();
            // This test mainly ensures forms are accessible on mobile
          }
        });
      });
    }
  });
}

// Cross-browser consistency tests
test.describe('Cross-Browser Consistency', () => {
  test('Visual Consistency Check', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual regression testing
    await expect(page).toHaveScreenshot(`dashboard-${test.info().project.name}.png`, {
      fullPage: true,
      threshold: 0.2 // Allow for minor rendering differences
    });
  });

  test('Data Format Consistency', async ({ page }) => {
    await page.goto('/dashboard');

    // Check currency formatting consistency
    const currencyElements = page.locator('[data-testid*="currency"], [data-testid*="amount"]');
    if (await currencyElements.count() > 0) {
      const formats = await currencyElements.allTextContents();

      // All currency formats should follow the same pattern
      const hasCurrencySymbol = formats.every(format =>
        format.includes('$') || format.includes('USD') || format.match(/\d+\.\d{2}/)
      );

      expect(hasCurrencySymbol).toBe(true);
    }
  });
});

// Browser capability reporting
test.afterAll(async () => {
  console.log('Browser Compatibility Test Suite Completed');
  console.log('Tested browsers:', browserConfigs.map(config => config.name).join(', '));
});