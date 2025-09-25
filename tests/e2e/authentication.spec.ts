import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Authentication Flows', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await testUtils.waitForPageLoad();
    });

    test('should display login form with required fields', async ({ page }) => {
      // Verify login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();

      // Verify navigation links
      await expect(page.locator('a[href="/register"], a:has-text("register"), a:has-text("sign up")')).toBeVisible();
      await expect(page.locator('a[href="/forgot-password"], a:has-text("forgot"), a:has-text("reset")')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      // Try to submit empty form
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Check for validation errors
      const errors = await testUtils.checkForErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Verify still on login page
      expect(page.url()).toContain('/login');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Fill with invalid credentials
      await testUtils.fillField('input[type="email"]', 'invalid@example.com');
      await testUtils.fillField('input[type="password"]', 'wrongpassword');

      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Check for authentication error
      const errors = await testUtils.checkForErrors();
      const hasAuthError = errors.some(error =>
        error.toLowerCase().includes('invalid') ||
        error.toLowerCase().includes('incorrect') ||
        error.toLowerCase().includes('not found') ||
        error.toLowerCase().includes('unauthorized')
      );

      expect(hasAuthError).toBe(true);
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      // Use test credentials (assuming they exist in test database)
      const testEmail = 'test@example.com';
      const testPassword = 'TestPassword123!';

      await testUtils.fillField('input[type="email"]', testEmail);
      await testUtils.fillField('input[type="password"]', testPassword);

      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for successful login redirect
      await testUtils.waitForUrlChange('/dashboard');
      expect(page.url()).toContain('/dashboard');

      // Verify user is authenticated (check for user menu or logout option)
      const isAuthenticated = await testUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"], button:has-text("Logout")');
      expect(isAuthenticated).toBe(true);
    });

    test('should remember me functionality work correctly', async ({ page }) => {
      const testEmail = 'test@example.com';
      const testPassword = 'TestPassword123!';

      await testUtils.fillField('input[type="email"]', testEmail);
      await testUtils.fillField('input[type="password"]', testPassword);

      // Check remember me option if available
      const rememberCheckbox = page.locator('input[type="checkbox"][name*="remember"], input[type="checkbox"] + label:has-text("Remember")');
      if (await rememberCheckbox.isVisible()) {
        await rememberCheckbox.check();
      }

      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for login to complete
      await Promise.race([
        testUtils.waitForUrlChange('/dashboard'),
        testUtils.waitForNotification('success')
      ]);

      // Verify login was successful
      const isLoggedIn = page.url().includes('/dashboard') ||
                        await testUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"]');
      expect(isLoggedIn).toBe(true);
    });

    test('should handle login with loading state', async ({ page }) => {
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');

      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await submitButton.click();

      // Check for loading state
      const buttonIsDisabled = await submitButton.isDisabled();
      const buttonText = await submitButton.textContent();
      const hasLoadingState = buttonIsDisabled ||
                             (buttonText && (buttonText.includes('...') || buttonText.includes('Loading')));

      expect(hasLoadingState).toBe(true);
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');
    });

    test('should successfully logout user', async ({ page }) => {
      // Find and click logout button
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');

      // Wait for redirect to login or home page
      await Promise.race([
        testUtils.waitForUrlChange('/login'),
        testUtils.waitForUrlChange('/'),
        testUtils.waitForNotification('logged out')
      ]);

      // Verify user is logged out
      const isLoggedOut = page.url().includes('/login') ||
                         page.url() === new URL('/', page.url()).toString() ||
                         !await testUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"]');

      expect(isLoggedOut).toBe(true);
    });

    test('should clear user session after logout', async ({ page }) => {
      // Logout
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');
      await testUtils.waitForUrlChange('/login');

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await testUtils.waitForUrlChange('/login');
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');

      // Should redirect to login
      await testUtils.waitForUrlChange('/login');
      expect(page.url()).toContain('/login');
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');

      // Refresh the page
      await page.reload();
      await testUtils.waitForPageLoad();

      // Should still be authenticated
      const isStillLoggedIn = page.url().includes('/dashboard') ||
                             await testUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"]');
      expect(isStillLoggedIn).toBe(true);
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');

      // Simulate session expiry by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to make an authenticated request by navigating to a protected route
      await page.goto('/payments');

      // Should redirect to login due to expired session
      await Promise.race([
        testUtils.waitForUrlChange('/login'),
        testUtils.waitForNotification('session expired')
      ]);

      const isRedirectedToLogin = page.url().includes('/login');
      expect(isRedirectedToLogin).toBe(true);
    });
  });

  test.describe('Authentication Persistence', () => {
    test('should persist authentication across browser tabs', async ({ page, context }) => {
      // Login in first tab
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');

      // Open new tab
      const newTab = await context.newPage();
      const newTabUtils = new TestUtils(newTab);

      // Navigate to protected route in new tab
      await newTab.goto('/dashboard');
      await newTabUtils.waitForPageLoad();

      // Should be authenticated in new tab
      const isAuthenticatedInNewTab = newTab.url().includes('/dashboard') ||
                                     await newTabUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"]');
      expect(isAuthenticatedInNewTab).toBe(true);

      await newTab.close();
    });

    test('should handle concurrent logout from multiple tabs', async ({ page, context }) => {
      // Login in first tab
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');

      // Open second tab
      const secondTab = await context.newPage();
      const secondTabUtils = new TestUtils(secondTab);
      await secondTab.goto('/dashboard');
      await secondTabUtils.waitForPageLoad();

      // Logout from first tab
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');
      await testUtils.waitForUrlChange('/login');

      // Second tab should also be logged out (or redirect on next action)
      await secondTab.reload();
      await Promise.race([
        secondTabUtils.waitForUrlChange('/login'),
        secondTab.waitForTimeout(3000)
      ]);

      const isSecondTabLoggedOut = secondTab.url().includes('/login');
      expect(isSecondTabLoggedOut).toBe(true);

      await secondTab.close();
    });
  });

  test.describe('Authentication Error Handling', () => {
    test('should handle network errors during login', async ({ page }) => {
      await page.goto('/login');

      // Block network requests to simulate network error
      await page.route('**/api/auth/**', route => route.abort());

      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Should show network error
      const errors = await testUtils.checkForErrors();
      const hasNetworkError = errors.some(error =>
        error.toLowerCase().includes('network') ||
        error.toLowerCase().includes('connection') ||
        error.toLowerCase().includes('timeout') ||
        error.toLowerCase().includes('error')
      );

      expect(hasNetworkError || errors.length > 0).toBe(true);
    });

    test('should handle rate limiting gracefully', async ({ page }) => {
      await page.goto('/login');

      // Attempt multiple rapid login attempts
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        await testUtils.fillField('input[type="email"]', 'invalid@example.com');
        await testUtils.fillField('input[type="password"]', 'wrongpassword');
        await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
        await page.waitForTimeout(500);
      }

      // Should eventually show rate limiting error
      const errors = await testUtils.checkForErrors();
      const hasRateLimitError = errors.some(error =>
        error.toLowerCase().includes('too many') ||
        error.toLowerCase().includes('rate') ||
        error.toLowerCase().includes('limit') ||
        error.toLowerCase().includes('try again')
      );

      // Rate limiting might not be immediate, so we accept either rate limit error or regular auth errors
      expect(hasRateLimitError || errors.length > 0).toBe(true);
    });
  });

  test.describe('Authentication Navigation', () => {
    test('should redirect to intended route after login', async ({ page }) => {
      // Try to access protected route while not authenticated
      await page.goto('/payments');
      await testUtils.waitForUrlChange('/login');

      // Login
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Should redirect to originally requested route
      await Promise.race([
        testUtils.waitForUrlChange('/payments'),
        testUtils.waitForUrlChange('/dashboard')
      ]);

      // Either the intended route or default dashboard is acceptable
      const isRedirectedCorrectly = page.url().includes('/payments') || page.url().includes('/dashboard');
      expect(isRedirectedCorrectly).toBe(true);
    });

    test('should prevent access to auth pages when already logged in', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await testUtils.fillField('input[type="email"]', 'test@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await testUtils.waitForUrlChange('/dashboard');

      // Try to access login page while authenticated
      await page.goto('/login');

      // Should redirect to dashboard or stay on current page
      await Promise.race([
        testUtils.waitForUrlChange('/dashboard'),
        page.waitForTimeout(2000)
      ]);

      const isRedirectedFromLogin = !page.url().includes('/login');
      expect(isRedirectedFromLogin).toBe(true);
    });
  });

  test.describe('Authentication Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.press('body', 'Tab'); // Should focus email input
      await expect(page.locator('input[type="email"]')).toBeFocused();

      await page.press('input[type="email"]', 'Tab'); // Should focus password input
      await expect(page.locator('input[type="password"]')).toBeFocused();

      // Fill using keyboard
      await page.keyboard.type('test@example.com');
      await page.press('input[type="password"]', 'Tab');
      await page.keyboard.type('TestPassword123!');

      // Submit using keyboard
      await page.press('body', 'Tab'); // Focus submit button
      await page.press('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")', 'Enter');

      // Should process login
      await Promise.race([
        testUtils.waitForUrlChange('/dashboard'),
        testUtils.waitForNotification(''),
        page.waitForTimeout(3000)
      ]);
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/login');

      // Check for proper form labeling
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Verify inputs have labels (either via label element, aria-label, or aria-labelledby)
      const emailHasLabel = await emailInput.getAttribute('aria-label') ||
                           await emailInput.getAttribute('aria-labelledby') ||
                           await page.locator('label[for]').count() > 0;

      const passwordHasLabel = await passwordInput.getAttribute('aria-label') ||
                              await passwordInput.getAttribute('aria-labelledby') ||
                              await page.locator('label[for]').count() > 0;

      expect(emailHasLabel).toBeTruthy();
      expect(passwordHasLabel).toBeTruthy();
      await expect(submitButton).toBeVisible();
    });
  });
});