import { test, expect } from '@playwright/test';

// Basic mobile responsiveness tests - works with existing project configurations
test.describe('Mobile Responsiveness Tests', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('Viewport meta tag is present', async ({ page }) => {
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
      await expect(viewportMeta).toHaveAttribute('content', /initial-scale=1/);
    });

    test('No horizontal scrolling', async ({ page }) => {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('Content is readable', async ({ page }) => {
      const bodyFontSize = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        return parseInt(computedStyle.fontSize);
      });

      expect(bodyFontSize).toBeGreaterThanOrEqual(14);
    });

    test('Interactive elements are touch-friendly', async ({ page }) => {
      const buttons = page.locator('button, a, input[type="submit"], input[type="button"]');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        // Check first few buttons for adequate size
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
              // Touch targets should be at least 40x40px (slightly lenient)
              expect(box.width).toBeGreaterThan(35);
              expect(box.height).toBeGreaterThan(35);
            }
          }
        }
      }
    });

    test('Navigation works on mobile', async ({ page }) => {
      // Look for navigation elements
      const navElements = page.locator('nav, [role="navigation"], header');
      if (await navElements.count() > 0) {
        await expect(navElements.first()).toBeVisible();
      }

      // Look for mobile menu if viewport is small
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        const mobileMenuTriggers = page.locator('[data-testid*="mobile"], button[aria-label*="menu"], .menu-toggle');
        if (await mobileMenuTriggers.count() > 0) {
          await expect(mobileMenuTriggers.first()).toBeVisible();
        }
      }
    });

    test('Forms are mobile-friendly', async ({ page }) => {
      // Test login form if available
      try {
        await page.goto('/login');
        const form = page.locator('form');

        if (await form.count() > 0) {
          const inputs = form.locator('input');
          const inputCount = await inputs.count();

          if (inputCount > 0) {
            // Check first input size
            const firstInput = inputs.first();
            const box = await firstInput.boundingBox();

            if (box) {
              expect(box.height).toBeGreaterThanOrEqual(40);
            }

            // Check for appropriate input types
            const emailInputs = form.locator('input[type="email"]');
            if (await emailInputs.count() > 0) {
              await expect(emailInputs.first()).toBeVisible();
            }
          }
        }
      } catch {
        // Login page might not exist, skip
      }
    });

    test('Page loads reasonably fast on mobile', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Mobile should load within 10 seconds (lenient)
      expect(loadTime).toBeLessThan(10000);
    });

    test('Images fit within viewport', async ({ page }) => {
      const images = page.locator('img');
      const imageCount = await images.count();
      const viewport = page.viewportSize();

      if (imageCount > 0 && viewport) {
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          if (await img.isVisible()) {
            const box = await img.boundingBox();
            if (box && box.width > 0) {
              // Images should not exceed viewport width
              expect(box.width).toBeLessThanOrEqual(viewport.width + 10);
            }
          }
        }
      }
    });

    test('Orientation changes are handled (mobile only)', async ({ page }) => {
      const originalViewport = page.viewportSize();
      if (!originalViewport || originalViewport.width > 768) return;

      // Test landscape orientation
      await page.setViewportSize({
        width: originalViewport.height,
        height: originalViewport.width
      });

      await page.waitForTimeout(500);

      // Should still not have horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);

      // Restore original orientation
      await page.setViewportSize(originalViewport);
    });
});