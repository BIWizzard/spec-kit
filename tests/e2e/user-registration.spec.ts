import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('User Registration Flow', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    await page.goto('/register');
    await testUtils.waitForPageLoad();
  });

  test('should display registration form with all required fields', async ({ page }) => {
    // Verify all required form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"], input[placeholder*="first"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"], input[placeholder*="last"]')).toBeVisible();
    await expect(page.locator('input[name="familyName"], input[placeholder*="family"]')).toBeVisible();

    // Verify register button is present
    await expect(page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")')).toBeVisible();

    // Verify link to login page exists
    await expect(page.locator('a[href="/login"], a:has-text("login"), a:has-text("sign in")')).toBeVisible();
  });

  test('should validate required fields and show error messages', async ({ page }) => {
    // Try to submit empty form
    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Check for validation errors
    const errors = await testUtils.checkForErrors();
    expect(errors.length).toBeGreaterThan(0);

    // Verify form doesn't submit without required fields
    expect(page.url()).toContain('/register');
  });

  test('should validate email format', async ({ page }) => {
    const testUser = testUtils.generateTestUser();

    // Fill form with invalid email
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', 'invalid-email');
    await testUtils.fillField('input[type="password"]', testUser.password);
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Check for email validation error
    const errors = await testUtils.checkForErrors();
    const hasEmailError = errors.some(error =>
      error.toLowerCase().includes('email') ||
      error.toLowerCase().includes('invalid') ||
      error.toLowerCase().includes('format')
    );
    expect(hasEmailError).toBe(true);
  });

  test('should validate password requirements', async ({ page }) => {
    const testUser = testUtils.generateTestUser();

    // Test with weak password
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', testUser.email);
    await testUtils.fillField('input[type="password"]', '123');
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Check for password validation error
    const errors = await testUtils.checkForErrors();
    const hasPasswordError = errors.some(error =>
      error.toLowerCase().includes('password') ||
      error.toLowerCase().includes('character') ||
      error.toLowerCase().includes('length')
    );
    expect(hasPasswordError).toBe(true);
  });

  test('should successfully register a new user with valid data', async ({ page }) => {
    const testUser = testUtils.generateTestUser();

    // Fill in all required fields
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', testUser.email);
    await testUtils.fillField('input[type="password"]', testUser.password);
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    // Submit the form
    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Wait for success response - could redirect to dashboard, login, or show success message
    await Promise.race([
      testUtils.waitForUrlChange('/dashboard'),
      testUtils.waitForUrlChange('/login'),
      testUtils.waitForUrlChange('/verify-email'),
      testUtils.waitForNotification('success')
    ]);

    // Verify successful registration (either redirected or success message shown)
    const currentUrl = page.url();
    const successfulRegistration =
      currentUrl.includes('/dashboard') ||
      currentUrl.includes('/login') ||
      currentUrl.includes('/verify-email') ||
      await testUtils.isElementVisible('[data-testid="success"], .success, .text-green-500');

    expect(successfulRegistration).toBe(true);
  });

  test('should prevent registration with duplicate email', async ({ page }) => {
    const testUser = testUtils.generateTestUser();
    const duplicateEmail = 'existing@example.com'; // Assume this email exists in test data

    // Fill form with existing email
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', duplicateEmail);
    await testUtils.fillField('input[type="password"]', testUser.password);
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Check for duplicate email error
    const errors = await testUtils.checkForErrors();
    const hasDuplicateError = errors.some(error =>
      error.toLowerCase().includes('already') ||
      error.toLowerCase().includes('exists') ||
      error.toLowerCase().includes('taken')
    );

    // Should either show error or handle gracefully
    expect(hasDuplicateError || page.url().includes('/register')).toBe(true);
  });

  test('should allow user to navigate to login page', async ({ page }) => {
    // Click on login link
    await page.click('a[href="/login"], a:has-text("login"), a:has-text("sign in")');

    // Verify navigation to login page
    await testUtils.waitForUrlChange('/login');
    expect(page.url()).toContain('/login');

    // Verify login form is displayed
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('should handle registration form submission with loading state', async ({ page }) => {
    const testUser = testUtils.generateTestUser();

    // Fill form
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', testUser.email);
    await testUtils.fillField('input[type="password"]', testUser.password);
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    // Submit and check for loading state
    const submitButton = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
    await submitButton.click();

    // Check if button shows loading state (disabled or shows loading text/spinner)
    const buttonIsDisabled = await submitButton.isDisabled();
    const buttonText = await submitButton.textContent();
    const hasLoadingState = buttonIsDisabled ||
                           (buttonText && (buttonText.includes('...') || buttonText.includes('Loading')));

    // Loading state should appear (even briefly)
    expect(hasLoadingState).toBe(true);
  });

  test('should maintain form data when validation fails', async ({ page }) => {
    const testUser = testUtils.generateTestUser();

    // Fill form with one invalid field
    await testUtils.fillField('input[name="firstName"], input[placeholder*="first"]', testUser.firstName);
    await testUtils.fillField('input[name="lastName"], input[placeholder*="last"]', testUser.lastName);
    await testUtils.fillField('input[type="email"]', 'invalid-email');
    await testUtils.fillField('input[type="password"]', testUser.password);
    await testUtils.fillField('input[name="familyName"], input[placeholder*="family"]', testUser.familyName);

    // Submit form
    await testUtils.clickButton('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    // Wait for validation
    await page.waitForTimeout(1000);

    // Verify valid data is still in form
    await expect(page.locator('input[name="firstName"], input[placeholder*="first"]')).toHaveValue(testUser.firstName);
    await expect(page.locator('input[name="lastName"], input[placeholder*="last"]')).toHaveValue(testUser.lastName);
    await expect(page.locator('input[name="familyName"], input[placeholder*="family"]')).toHaveValue(testUser.familyName);
    await expect(page.locator('input[type="password"]')).toHaveValue(testUser.password);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await testUtils.waitForPageLoad();

    // Verify form is still functional on mobile
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await testUtils.waitForPageLoad();

    // Verify form is still functional on tablet
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});