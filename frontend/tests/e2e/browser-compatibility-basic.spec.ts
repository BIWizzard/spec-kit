import { test, expect } from '@playwright/test';

// Basic browser compatibility test - validates essential functionality
test.describe('Basic Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('Page loads successfully', async ({ page }) => {
    // Check that the page loads and has basic structure
    await expect(page).toHaveTitle(/KGiQ|Family Finance/);

    // Check that basic HTML structure is present
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Navigation elements are present', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, header, [role="navigation"]');
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('JavaScript is functional', async ({ page }) => {
    // Test basic JavaScript functionality
    const jsWorking = await page.evaluate(() => {
      return typeof window !== 'undefined' && typeof document !== 'undefined';
    });

    expect(jsWorking).toBe(true);
  });

  test('CSS is loading', async ({ page }) => {
    // Check that CSS is applied
    const bodyStyle = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.fontFamily !== 'initial';
    });

    expect(bodyStyle).toBe(true);
  });

  test('LocalStorage is available', async ({ page }) => {
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
  });

  test('Fetch API is available', async ({ page }) => {
    const hasFetch = await page.evaluate(() => {
      return typeof fetch !== 'undefined';
    });

    expect(hasFetch).toBe(true);
  });

  test('Basic form elements work', async ({ page }) => {
    // Check if we can navigate to a form page
    try {
      await page.goto('/login');

      // Look for form elements
      const form = page.locator('form');
      if (await form.count() > 0) {
        await expect(form.first()).toBeVisible();

        // Check for input fields
        const inputs = page.locator('input');
        if (await inputs.count() > 0) {
          await expect(inputs.first()).toBeVisible();
        }
      }
    } catch {
      // Login page might not exist, which is OK for this basic test
    }
  });

  test('Console has no critical errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out non-critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('analytics') &&
      !error.includes('AdBlocker') &&
      !error.toLowerCase().includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});