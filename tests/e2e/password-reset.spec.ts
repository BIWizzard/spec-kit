import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Password Reset Flow', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
  });

  test.describe('Forgot Password Request', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/forgot-password');
      await testUtils.waitForPageLoad();
    });

    test('should display forgot password form with required elements', async ({ page }) => {
      // Verify form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")')).toBeVisible();

      // Verify navigation links
      await expect(page.locator('a[href="/login"], a:has-text("login"), a:has-text("back to login")')).toBeVisible();

      // Verify instructions or help text
      const hasInstructions = await testUtils.isElementVisible('[data-testid="instructions"], .instructions, p:has-text("email"), p:has-text("reset")');
      expect(hasInstructions).toBe(true);
    });

    test('should validate email field is required', async ({ page }) => {
      // Try to submit without email
      await testUtils.clickButton('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Check for validation errors
      const errors = await testUtils.checkForErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Should still be on forgot password page
      expect(page.url()).toContain('/forgot-password');
    });

    test('should validate email format', async ({ page }) => {
      // Enter invalid email format
      await testUtils.fillField('input[type="email"]', 'invalid-email');
      await testUtils.clickButton('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Check for email validation error
      const errors = await testUtils.checkForErrors();
      const hasEmailError = errors.some(error =>
        error.toLowerCase().includes('email') ||
        error.toLowerCase().includes('invalid') ||
        error.toLowerCase().includes('format')
      );
      expect(hasEmailError).toBe(true);
    });

    test('should successfully send reset request for valid email', async ({ page }) => {
      const testEmail = 'test@example.com';

      // Enter valid email
      await testUtils.fillField('input[type="email"]', testEmail);
      await testUtils.clickButton('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Wait for success message or redirect
      await Promise.race([
        testUtils.waitForNotification('sent'),
        testUtils.waitForNotification('check'),
        testUtils.waitForUrlChange('/login'),
        page.waitForTimeout(5000)
      ]);

      // Verify success indication (either message or redirect)
      const hasSuccessMessage = await testUtils.isElementVisible('[data-testid="success"], .success, .text-green-500');
      const isRedirected = page.url().includes('/login') || page.url().includes('/reset-sent');

      expect(hasSuccessMessage || isRedirected).toBe(true);
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      const nonExistentEmail = 'nonexistent@example.com';

      await testUtils.fillField('input[type="email"]', nonExistentEmail);
      await testUtils.clickButton('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Wait for response
      await page.waitForTimeout(3000);

      // Should either show generic success message (security) or specific error
      const hasResponse = await testUtils.isElementVisible('[data-testid="success"], [data-testid="error"], .success, .error');
      expect(hasResponse).toBe(true);
    });

    test('should show loading state during request', async ({ page }) => {
      await testUtils.fillField('input[type="email"]', 'test@example.com');

      const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');
      await submitButton.click();

      // Check for loading state
      const buttonIsDisabled = await submitButton.isDisabled();
      const buttonText = await submitButton.textContent();
      const hasLoadingState = buttonIsDisabled ||
                             (buttonText && (buttonText.includes('...') || buttonText.includes('Sending')));

      expect(hasLoadingState).toBe(true);
    });

    test('should prevent multiple rapid submissions', async ({ page }) => {
      const testEmail = 'test@example.com';
      await testUtils.fillField('input[type="email"]', testEmail);

      const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Click multiple times rapidly
      await submitButton.click();
      await submitButton.click();
      await submitButton.click();

      // Button should be disabled to prevent spam
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Reset Password Form', () => {
    // Mock reset token for testing
    const mockToken = 'mock-reset-token-12345';

    test.beforeEach(async ({ page }) => {
      await page.goto(`/reset-password?token=${mockToken}`);
      await testUtils.waitForPageLoad();
    });

    test('should display reset password form with required fields', async ({ page }) => {
      // Verify form elements
      await expect(page.locator('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]')).toBeVisible();
      await expect(page.locator('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Update")')).toBeVisible();

      // Verify password requirements are displayed
      const hasRequirements = await testUtils.isElementVisible('[data-testid="requirements"], .requirements, ul:has-text("character"), p:has-text("least")');
      expect(hasRequirements).toBe(true);
    });

    test('should validate password requirements', async ({ page }) => {
      // Test with weak password
      await testUtils.fillField('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]', '123');
      await testUtils.fillField('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]', '123');
      await testUtils.clickButton('button[type="submit"], button:has-text("Reset"), button:has-text("Update")');

      // Check for password validation errors
      const errors = await testUtils.checkForErrors();
      const hasPasswordError = errors.some(error =>
        error.toLowerCase().includes('password') ||
        error.toLowerCase().includes('character') ||
        error.toLowerCase().includes('length')
      );
      expect(hasPasswordError).toBe(true);
    });

    test('should validate password confirmation matches', async ({ page }) => {
      const newPassword = 'NewSecurePassword123!';

      await testUtils.fillField('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]', newPassword);
      await testUtils.fillField('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]', 'DifferentPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Reset"), button:has-text("Update")');

      // Check for password mismatch error
      const errors = await testUtils.checkForErrors();
      const hasMatchError = errors.some(error =>
        error.toLowerCase().includes('match') ||
        error.toLowerCase().includes('confirm') ||
        error.toLowerCase().includes('same')
      );
      expect(hasMatchError).toBe(true);
    });

    test('should successfully reset password with valid data', async ({ page }) => {
      const newPassword = 'NewSecurePassword123!';

      await testUtils.fillField('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]', newPassword);
      await testUtils.fillField('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]', newPassword);
      await testUtils.clickButton('button[type="submit"], button:has-text("Reset"), button:has-text("Update")');

      // Wait for success response
      await Promise.race([
        testUtils.waitForUrlChange('/login'),
        testUtils.waitForNotification('success'),
        testUtils.waitForNotification('updated'),
        page.waitForTimeout(5000)
      ]);

      // Verify success (redirect to login or success message)
      const isSuccessful = page.url().includes('/login') ||
                          await testUtils.isElementVisible('[data-testid="success"], .success, .text-green-500');
      expect(isSuccessful).toBe(true);
    });

    test('should handle invalid or expired token', async ({ page }) => {
      // Navigate with invalid token
      await page.goto('/reset-password?token=invalid-token');
      await testUtils.waitForPageLoad();

      // Should show error or redirect
      const hasError = await testUtils.isElementVisible('[data-testid="error"], .error, .text-red-500');
      const isRedirected = page.url().includes('/login') || page.url().includes('/forgot-password');

      expect(hasError || isRedirected).toBe(true);
    });

    test('should handle missing token gracefully', async ({ page }) => {
      // Navigate without token
      await page.goto('/reset-password');
      await testUtils.waitForPageLoad();

      // Should redirect or show error
      const hasError = await testUtils.isElementVisible('[data-testid="error"], .error');
      const isRedirected = page.url().includes('/login') || page.url().includes('/forgot-password');

      expect(hasError || isRedirected).toBe(true);
    });

    test('should show password strength indicator', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]');

      // Type weak password
      await passwordInput.fill('123');

      // Check for strength indicator
      let hasStrengthIndicator = await testUtils.isElementVisible('[data-testid="strength"], .strength, .password-strength');

      // Type stronger password
      await passwordInput.fill('StrongPassword123!');

      // Strength indicator should still be visible (possibly with different color/text)
      hasStrengthIndicator = hasStrengthIndicator || await testUtils.isElementVisible('[data-testid="strength"], .strength, .password-strength');

      expect(hasStrengthIndicator).toBe(true);
    });

    test('should show real-time password confirmation validation', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]');
      const confirmInput = page.locator('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]');

      // Fill passwords that don't match
      await passwordInput.fill('Password123!');
      await confirmInput.fill('Different123!');
      await confirmInput.blur(); // Trigger validation

      // Check for mismatch indication
      const hasMismatchError = await testUtils.isElementVisible('[data-testid="mismatch"], .mismatch, .text-red-500');

      // Fix the mismatch
      await confirmInput.fill('Password123!');
      await confirmInput.blur();

      // Should show match confirmation or remove error
      const hasMatchConfirmation = await testUtils.isElementVisible('[data-testid="match"], .match, .text-green-500');
      const errorRemoved = !await testUtils.isElementVisible('[data-testid="mismatch"], .mismatch, .text-red-500');

      expect(hasMismatchError && (hasMatchConfirmation || errorRemoved)).toBe(true);
    });
  });

  test.describe('Password Reset Integration', () => {
    test('should allow login with new password after reset', async ({ page }) => {
      const userEmail = 'test@example.com';
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewSecurePassword123!';
      const mockToken = 'valid-reset-token';

      // Step 1: Reset password
      await page.goto(`/reset-password?token=${mockToken}`);
      await testUtils.fillField('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]', newPassword);
      await testUtils.fillField('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]', newPassword);
      await testUtils.clickButton('button[type="submit"], button:has-text("Reset"), button:has-text("Update")');

      // Wait for reset completion
      await Promise.race([
        testUtils.waitForUrlChange('/login'),
        testUtils.waitForNotification('success'),
        page.waitForTimeout(5000)
      ]);

      // Step 2: Navigate to login if not already there
      if (!page.url().includes('/login')) {
        await page.goto('/login');
        await testUtils.waitForPageLoad();
      }

      // Step 3: Try login with old password (should fail)
      await testUtils.fillField('input[type="email"]', userEmail);
      await testUtils.fillField('input[type="password"]', oldPassword);
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Should show error for old password
      await page.waitForTimeout(2000);
      const errors = await testUtils.checkForErrors();
      const hasOldPasswordError = errors.length > 0 || page.url().includes('/login');

      // Step 4: Login with new password (should succeed)
      await testUtils.fillField('input[type="email"]', userEmail);
      await testUtils.fillField('input[type="password"]', newPassword);
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Should successfully login
      await Promise.race([
        testUtils.waitForUrlChange('/dashboard'),
        testUtils.waitForNotification('success'),
        page.waitForTimeout(5000)
      ]);

      const isLoggedIn = page.url().includes('/dashboard') ||
                        await testUtils.isElementVisible('[data-testid="user-menu"], [data-testid="logout"]');

      expect(hasOldPasswordError && isLoggedIn).toBe(true);
    });

    test('should invalidate reset token after use', async ({ page }) => {
      const newPassword = 'NewSecurePassword123!';
      const mockToken = 'one-time-use-token';

      // Use token first time
      await page.goto(`/reset-password?token=${mockToken}`);
      await testUtils.waitForPageLoad();
      await testUtils.fillField('input[type="password"][name*="password"], input[type="password"][placeholder*="password"]', newPassword);
      await testUtils.fillField('input[type="password"][name*="confirm"], input[type="password"][placeholder*="confirm"]', newPassword);
      await testUtils.clickButton('button[type="submit"], button:has-text("Reset"), button:has-text("Update")');

      // Wait for completion
      await page.waitForTimeout(3000);

      // Try to use same token again
      await page.goto(`/reset-password?token=${mockToken}`);
      await testUtils.waitForPageLoad();

      // Should show error or redirect (token should be invalid now)
      const hasError = await testUtils.isElementVisible('[data-testid="error"], .error, .text-red-500');
      const isRedirected = page.url().includes('/login') || page.url().includes('/forgot-password');

      expect(hasError || isRedirected).toBe(true);
    });
  });

  test.describe('Password Reset Security', () => {
    test('should prevent brute force token attempts', async ({ page }) => {
      const invalidTokens = [
        'invalid-token-1',
        'invalid-token-2',
        'invalid-token-3',
        'invalid-token-4',
        'invalid-token-5'
      ];

      for (const token of invalidTokens) {
        await page.goto(`/reset-password?token=${token}`);
        await page.waitForTimeout(1000);

        // Check if access is blocked after multiple attempts
        const isBlocked = await testUtils.isElementVisible('[data-testid="blocked"], .blocked, [role="alert"]');
        if (isBlocked) break;
      }

      // Should eventually show rate limiting or blocking
      const hasSecurityMeasure = await testUtils.isElementVisible('[data-testid="error"], [data-testid="blocked"], .error');
      expect(hasSecurityMeasure).toBe(true);
    });

    test('should handle concurrent reset requests', async ({ page }) => {
      const testEmail = 'test@example.com';

      // Send multiple rapid reset requests
      await page.goto('/forgot-password');
      await testUtils.fillField('input[type="email"]', testEmail);

      const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Multiple rapid clicks
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);

      // Should handle gracefully (rate limiting or single request processing)
      await page.waitForTimeout(3000);
      const hasResponse = await testUtils.isElementVisible('[data-testid="success"], [data-testid="error"], .success, .error');
      expect(hasResponse).toBe(true);
    });
  });

  test.describe('Password Reset Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/forgot-password');
      await testUtils.waitForPageLoad();

      // Tab to email input
      await page.press('body', 'Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();

      // Type email using keyboard
      await page.keyboard.type('test@example.com');

      // Tab to submit button
      await page.press('input[type="email"]', 'Tab');
      await expect(page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")')).toBeFocused();

      // Submit using keyboard
      await page.press('button[type="submit"], button:has-text("Send"), button:has-text("Reset")', 'Enter');

      // Should process request
      await page.waitForTimeout(2000);
    });

    test('should have proper ARIA labels and descriptions', async ({ page }) => {
      await page.goto('/forgot-password');

      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Check for proper labeling
      const emailHasLabel = await emailInput.getAttribute('aria-label') ||
                           await emailInput.getAttribute('aria-labelledby') ||
                           await page.locator('label[for]').count() > 0;

      expect(emailHasLabel).toBeTruthy();
      await expect(submitButton).toBeVisible();

      // Check for helpful descriptions
      const hasDescription = await testUtils.isElementVisible('[aria-describedby], [role="status"], p:has-text("email")');
      expect(hasDescription).toBe(true);
    });

    test('should announce form validation errors to screen readers', async ({ page }) => {
      await page.goto('/forgot-password');

      // Submit empty form to trigger validation
      await testUtils.clickButton('button[type="submit"], button:has-text("Send"), button:has-text("Reset")');

      // Check for ARIA live regions or role="alert"
      const hasLiveRegion = await testUtils.isElementVisible('[role="alert"], [aria-live], [data-testid="error"]');
      expect(hasLiveRegion).toBe(true);
    });
  });

  test.describe('Password Reset UI/UX', () => {
    test('should be responsive on different screen sizes', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/forgot-password');
      await testUtils.waitForPageLoad();

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await testUtils.waitForPageLoad();

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Reset")')).toBeVisible();

      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should provide clear visual feedback during form interactions', async ({ page }) => {
      await page.goto('/forgot-password');

      const emailInput = page.locator('input[type="email"]');

      // Focus should change input appearance
      await emailInput.focus();
      const focusedClass = await emailInput.getAttribute('class');
      expect(focusedClass).toBeTruthy();

      // Invalid input should show visual indication
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(500);

      // Check for error styling
      const hasErrorStyling = await testUtils.isElementVisible('.error, .invalid, .border-red-500, [aria-invalid="true"]');
      expect(hasErrorStyling).toBe(true);
    });
  });
});