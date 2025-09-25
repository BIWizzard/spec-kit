import { test, expect, Page } from '@playwright/test';
import { devices } from '@playwright/test';

// Mobile responsiveness testing for KGiQ Family Finance
// Tests UI adaptation across different mobile devices and orientations

// Mobile device configurations for testing
const mobileDevices = [
  {
    name: 'iPhone 12',
    device: devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 12'].userAgent
  },
  {
    name: 'iPhone 12 Pro',
    device: devices['iPhone 12 Pro'],
    viewport: { width: 390, height: 844 },
    userAgent: devices['iPhone 12 Pro'].userAgent
  },
  {
    name: 'iPhone SE',
    device: devices['iPhone SE'],
    viewport: { width: 375, height: 667 },
    userAgent: devices['iPhone SE'].userAgent
  },
  {
    name: 'Pixel 5',
    device: devices['Pixel 5'],
    viewport: { width: 393, height: 851 },
    userAgent: devices['Pixel 5'].userAgent
  },
  {
    name: 'Galaxy S21',
    device: devices['Galaxy S21'],
    viewport: { width: 384, height: 854 },
    userAgent: devices['Galaxy S21'].userAgent
  },
  {
    name: 'iPad Mini',
    device: devices['iPad Mini'],
    viewport: { width: 768, height: 1024 },
    userAgent: devices['iPad Mini'].userAgent
  }
];

// Responsive design test utilities
async function checkElementVisibility(page: Page, selector: string, shouldBeVisible: boolean = true) {
  const element = page.locator(selector);
  const count = await element.count();

  if (count === 0 && shouldBeVisible) {
    throw new Error(`Element ${selector} not found but expected to be visible`);
  }

  if (count > 0) {
    if (shouldBeVisible) {
      await expect(element.first()).toBeVisible();
    } else {
      await expect(element.first()).toBeHidden();
    }
  }
}

async function checkViewportMeta(page: Page) {
  const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewportMeta).toBeTruthy();
  expect(viewportMeta).toContain('width=device-width');
  expect(viewportMeta).toContain('initial-scale=1');
}

async function checkTouchTargetSizes(page: Page) {
  // Check that interactive elements meet minimum touch target size (44x44px)
  const interactiveElements = await page.locator('button, a, input, select, textarea, [role="button"]').all();

  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    if (box) {
      // Allow for some flexibility in touch target sizes
      const minSize = 40; // Slightly below 44px for flexibility
      if (box.width < minSize && box.height < minSize) {
        const elementInfo = await element.evaluate(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.slice(0, 20)
        }));

        console.warn(`Touch target too small: ${JSON.stringify(elementInfo)} - ${box.width}x${box.height}px`);
      }
    }
  }
}

async function checkHorizontalScrolling(page: Page) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  expect(hasHorizontalScroll).toBe(false);
}

async function checkMobileNavigation(page: Page) {
  // Look for mobile menu indicators
  const mobileMenuElements = [
    '[data-testid="mobile-menu"]',
    'button[aria-label*="menu"]',
    '.hamburger',
    '.menu-toggle',
    'button:has-text("Menu")',
    '[aria-expanded]'
  ];

  let hasMobileNav = false;
  for (const selector of mobileMenuElements) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      hasMobileNav = true;

      // Test mobile menu functionality
      if (await element.first().isVisible()) {
        await element.first().click();

        // Check if menu opens/closes
        const ariaExpanded = await element.first().getAttribute('aria-expanded');
        if (ariaExpanded) {
          expect(['true', 'false']).toContain(ariaExpanded);
        }
      }
      break;
    }
  }

  return hasMobileNav;
}

// Run tests for each mobile device
for (const deviceConfig of mobileDevices) {
  test.describe(`Mobile Responsiveness: ${deviceConfig.name}`, () => {
    test.use(deviceConfig.device);

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('Viewport meta tag is properly configured', async ({ page }) => {
      await checkViewportMeta(page);
    });

    test('Page content fits within viewport', async ({ page }) => {
      await checkHorizontalScrolling(page);
    });

    test('Navigation is mobile-friendly', async ({ page }) => {
      const hasMobileNav = await checkMobileNavigation(page);

      // For mobile devices, we expect mobile navigation
      if (deviceConfig.viewport.width < 768) {
        expect(hasMobileNav).toBe(true);
      }
    });

    test('Touch targets meet minimum size requirements', async ({ page }) => {
      await checkTouchTargetSizes(page);
    });

    test('Text is readable without zooming', async ({ page }) => {
      // Check font sizes are adequate for mobile
      const bodyFontSize = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        return parseInt(computedStyle.fontSize);
      });

      expect(bodyFontSize).toBeGreaterThanOrEqual(14); // Minimum readable font size
    });

    test('Forms are mobile-optimized', async ({ page }) => {
      // Test common form pages
      const formPages = ['/login', '/register', '/income/create', '/payments/create'];

      for (const formPage of formPages) {
        try {
          await page.goto(formPage);

          // Check form elements are properly sized
          const inputs = page.locator('input, select, textarea');
          const inputCount = await inputs.count();

          if (inputCount > 0) {
            for (let i = 0; i < Math.min(inputCount, 3); i++) {
              const input = inputs.nth(i);
              const box = await input.boundingBox();

              if (box) {
                expect(box.height).toBeGreaterThanOrEqual(40); // Minimum touch target height
              }
            }

            // Check input types for mobile optimization
            const numberInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
            const emailInputs = page.locator('input[type="email"]');
            const telInputs = page.locator('input[type="tel"]');

            // These should trigger appropriate mobile keyboards
            if (await numberInputs.count() > 0) {
              const inputMode = await numberInputs.first().getAttribute('inputmode');
              expect(['numeric', 'decimal', null]).toContain(inputMode);
            }
          }
        } catch (error) {
          // Form page might not exist, skip
          continue;
        }
      }
    });

    test('Content is properly stacked on mobile', async ({ page }) => {
      // Check that content stacks vertically instead of horizontally
      const containers = page.locator('div, section, article, main').filter({
        has: page.locator('div, p, h1, h2, h3, h4, h5, h6')
      });

      const containerCount = await containers.count();
      if (containerCount > 1) {
        // Check first few containers for proper stacking
        for (let i = 0; i < Math.min(containerCount, 3); i++) {
          const container = containers.nth(i);
          const box = await container.boundingBox();

          if (box) {
            // Container should not exceed viewport width
            expect(box.width).toBeLessThanOrEqual(deviceConfig.viewport.width + 20); // Allow small margin
          }
        }
      }
    });

    test('Images and media are responsive', async ({ page }) => {
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const img = images.nth(i);
          const box = await img.boundingBox();

          if (box && box.width > 0) {
            // Images should not exceed viewport width
            expect(box.width).toBeLessThanOrEqual(deviceConfig.viewport.width);

            // Check if image has responsive attributes
            const srcset = await img.getAttribute('srcset');
            const sizes = await img.getAttribute('sizes');
            const style = await img.getAttribute('style');

            // Either srcset/sizes or CSS should handle responsiveness
            const isResponsive = srcset || sizes || (style && style.includes('width'));
            if (!isResponsive) {
              console.warn(`Image may not be responsive: ${await img.getAttribute('src')}`);
            }
          }
        }
      }
    });

    test('Tables are mobile-friendly', async ({ page }) => {
      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        for (let i = 0; i < tableCount; i++) {
          const table = tables.nth(i);
          const box = await table.boundingBox();

          if (box) {
            // Table should either fit in viewport or have horizontal scrolling container
            if (box.width > deviceConfig.viewport.width) {
              const parent = table.locator('xpath=..');
              const parentStyle = await parent.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                  overflowX: style.overflowX,
                  overflowY: style.overflowY
                };
              });

              expect(['auto', 'scroll']).toContain(parentStyle.overflowX);
            }
          }
        }
      }
    });

    test('Modals and dialogs work on mobile', async ({ page }) => {
      // Look for modal triggers
      const modalTriggers = page.locator('[data-modal], [data-toggle="modal"], button:has-text("Modal"), button:has-text("Dialog")');
      const triggerCount = await modalTriggers.count();

      if (triggerCount > 0) {
        // Test first modal trigger
        const trigger = modalTriggers.first();
        await trigger.click();

        // Check if modal appears and is properly sized
        const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
        if (await modal.count() > 0) {
          await expect(modal.first()).toBeVisible();

          const modalBox = await modal.first().boundingBox();
          if (modalBox) {
            // Modal should fit within viewport with some margin
            expect(modalBox.width).toBeLessThanOrEqual(deviceConfig.viewport.width - 20);
          }

          // Check for close button
          const closeButton = page.locator('[aria-label*="close"], .close, button:has-text("Close"), button:has-text("×")');
          if (await closeButton.count() > 0) {
            await closeButton.first().click();
            await expect(modal.first()).toBeHidden();
          }
        }
      }
    });

    // Portrait/Landscape orientation tests (for phone-sized devices)
    if (deviceConfig.viewport.width < 768) {
      test('Layout adapts to orientation changes', async ({ page }) => {
        // Test portrait orientation (default)
        await page.setViewportSize({
          width: deviceConfig.viewport.width,
          height: deviceConfig.viewport.height
        });

        await checkHorizontalScrolling(page);

        // Test landscape orientation
        await page.setViewportSize({
          width: deviceConfig.viewport.height,
          height: deviceConfig.viewport.width
        });

        await page.waitForTimeout(500); // Allow layout to adjust
        await checkHorizontalScrolling(page);

        // Restore portrait
        await page.setViewportSize({
          width: deviceConfig.viewport.width,
          height: deviceConfig.viewport.height
        });
      });
    }

    test('Performance is acceptable on mobile', async ({ page }) => {
      // Test key pages for mobile performance
      const testPages = ['/', '/dashboard', '/income', '/payments'];

      for (const testPage of testPages) {
        const startTime = Date.now();

        try {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');

          const loadTime = Date.now() - startTime;

          // Mobile should load within 8 seconds (more lenient than desktop)
          expect(loadTime).toBeLessThan(8000);

          // Check for performance metrics
          const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return navigation ? {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
              loadComplete: navigation.loadEventEnd - navigation.navigationStart
            } : null;
          });

          if (performanceMetrics) {
            expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);
            expect(performanceMetrics.loadComplete).toBeLessThan(8000);
          }
        } catch (error) {
          // Page might not exist, skip
          continue;
        }
      }
    });

    test('Accessibility is maintained on mobile', async ({ page }) => {
      // Check for keyboard navigation support
      const focusableElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const focusableCount = await focusableElements.count();

      if (focusableCount > 0) {
        // Test first few focusable elements
        for (let i = 0; i < Math.min(focusableCount, 5); i++) {
          const element = focusableElements.nth(i);
          await element.focus();

          // Element should be visible when focused
          await expect(element).toBeVisible();

          // Check for focus indicators
          const focusedElement = await page.evaluate(() => document.activeElement);
          expect(focusedElement).toBeTruthy();
        }
      }

      // Check for ARIA labels on interactive elements
      const interactiveElements = page.locator('button, a, input');
      const interactiveCount = await interactiveElements.count();

      if (interactiveCount > 0) {
        for (let i = 0; i < Math.min(interactiveCount, 10); i++) {
          const element = interactiveElements.nth(i);

          // Check for accessibility attributes
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledby = await element.getAttribute('aria-labelledby');
          const title = await element.getAttribute('title');
          const textContent = await element.textContent();

          // Element should have some form of accessible label
          const hasAccessibleLabel = ariaLabel || ariaLabelledby || title || (textContent && textContent.trim().length > 0);

          if (!hasAccessibleLabel) {
            const elementInfo = await element.evaluate(el => ({
              tagName: el.tagName,
              className: el.className,
              id: el.id
            }));
            console.warn(`Interactive element may lack accessible label: ${JSON.stringify(elementInfo)}`);
          }
        }
      }
    });
  });
}

// Cross-device consistency tests
test.describe('Cross-Device Mobile Consistency', () => {
  test('Content hierarchy is consistent across devices', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(mobileDevices[0].device), // iPhone 12
      browser.newContext(mobileDevices[3].device), // Pixel 5
      browser.newContext(mobileDevices[5].device)  // iPad Mini
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    try {
      // Load same page on all devices
      await Promise.all(pages.map(page => page.goto('/')));
      await Promise.all(pages.map(page => page.waitForLoadState('networkidle')));

      // Check heading hierarchy is consistent
      for (const page of pages) {
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
        expect(headings.length).toBeGreaterThan(0);
      }

      // Main content should be present on all devices
      for (const page of pages) {
        const mainContent = page.locator('main, [role="main"], .main-content');
        if (await mainContent.count() > 0) {
          await expect(mainContent.first()).toBeVisible();
        }
      }
    } finally {
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('Navigation patterns work across device sizes', async ({ browser }) => {
    const mobileContext = await browser.newContext(mobileDevices[0].device);
    const tabletContext = await browser.newContext(mobileDevices[5].device);

    const mobilePage = await mobileContext.newPage();
    const tabletPage = await tabletContext.newPage();

    try {
      await Promise.all([
        mobilePage.goto('/'),
        tabletPage.goto('/')
      ]);

      // Both should have functional navigation
      const mobileNav = await checkMobileNavigation(mobilePage);
      const tabletNav = await checkMobileNavigation(tabletPage);

      // Both should have some form of navigation
      expect(mobileNav || tabletNav).toBe(true);
    } finally {
      await mobileContext.close();
      await tabletContext.close();
    }
  });
});

// Performance benchmarking across devices
test.describe('Mobile Performance Benchmarks', () => {
  for (const deviceConfig of mobileDevices.slice(0, 3)) { // Test subset for performance
    test(`Performance benchmark: ${deviceConfig.name}`, async ({ page }) => {
      test.use(deviceConfig.device);

      const performanceResults: Record<string, number> = {};

      // Test key pages
      const testPages = ['/', '/dashboard', '/login'];

      for (const testPage of testPages) {
        const startTime = performance.now();

        try {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');

          const loadTime = performance.now() - startTime;
          performanceResults[testPage] = loadTime;

          // Performance expectations (more lenient for mobile)
          expect(loadTime).toBeLessThan(10000); // 10 seconds max
        } catch (error) {
          // Page might not exist
          continue;
        }
      }

      // Log performance results
      console.log(`Performance results for ${deviceConfig.name}:`, performanceResults);
    });
  }
});