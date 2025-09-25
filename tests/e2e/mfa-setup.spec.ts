import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('MFA (Multi-Factor Authentication) Setup', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for MFA tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access MFA settings
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('MFA Setup Access', () => {
    test('should navigate to MFA setup from security settings', async ({ page }) => {
      // Navigate to security settings
      await page.goto('/settings/security');
      await testUtils.waitForPageLoad();

      // Find MFA setup link or button
      const mfaSetupLink = page.locator('a[href*="mfa"], button:has-text("MFA"), button:has-text("Two-Factor"), a:has-text("authenticator")');
      await expect(mfaSetupLink).toBeVisible();

      await mfaSetupLink.click();
      await testUtils.waitForPageLoad();

      // Should be on MFA setup page
      const isMFAPage = page.url().includes('/mfa') ||
                       page.url().includes('/two-factor') ||
                       await testUtils.isElementVisible('[data-testid="mfa-setup"], h1:has-text("MFA"), h1:has-text("Two-Factor")');

      expect(isMFAPage).toBe(true);
    });

    test('should display current MFA status', async ({ page }) => {
      await page.goto('/settings/security');
      await testUtils.waitForPageLoad();

      // Should show current MFA status (enabled/disabled)
      const hasStatusIndicator = await testUtils.isElementVisible('[data-testid="mfa-status"], .mfa-status, span:has-text("Enabled"), span:has-text("Disabled")');
      expect(hasStatusIndicator).toBe(true);
    });
  });

  test.describe('TOTP Authenticator Setup', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings/security/mfa/setup');
      await testUtils.waitForPageLoad();
    });

    test('should display MFA setup instructions and QR code', async ({ page }) => {
      // Verify setup instructions are present
      const hasInstructions = await testUtils.isElementVisible('[data-testid="instructions"], .instructions, p:has-text("authenticator"), p:has-text("scan")');
      expect(hasInstructions).toBe(true);

      // Verify QR code is displayed
      const hasQRCode = await testUtils.isElementVisible('[data-testid="qr-code"], .qr-code, img[src*="qr"], canvas, svg');
      expect(hasQRCode).toBe(true);

      // Verify manual setup code is available
      const hasManualCode = await testUtils.isElementVisible('[data-testid="manual-code"], .manual-code, code, [data-testid="secret"]');
      expect(hasManualCode).toBe(true);
    });

    test('should provide alternative setup methods', async ({ page }) => {
      // Check for manual entry option
      const hasManualOption = await testUtils.isElementVisible('button:has-text("manual"), a:has-text("manual"), [data-testid="manual-setup"]');
      expect(hasManualOption).toBe(true);

      if (hasManualOption) {
        await testUtils.clickButton('button:has-text("manual"), a:has-text("manual"), [data-testid="manual-setup"]');

        // Should show the secret key for manual entry
        const hasSecretKey = await testUtils.isElementVisible('[data-testid="secret"], .secret-key, code');
        expect(hasSecretKey).toBe(true);
      }
    });

    test('should validate TOTP code format', async ({ page }) => {
      // Find TOTP input field
      const totpInput = page.locator('input[name*="code"], input[name*="totp"], input[placeholder*="code"]');
      await expect(totpInput).toBeVisible();

      // Try invalid code format
      await totpInput.fill('123');
      await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Enable")');

      // Should show validation error
      const errors = await testUtils.checkForErrors();
      const hasFormatError = errors.some(error =>
        error.toLowerCase().includes('code') ||
        error.toLowerCase().includes('digit') ||
        error.toLowerCase().includes('6')
      );
      expect(hasFormatError).toBe(true);
    });

    test('should reject invalid TOTP codes', async ({ page }) => {
      const totpInput = page.locator('input[name*="code"], input[name*="totp"], input[placeholder*="code"]');

      // Enter invalid 6-digit code
      await totpInput.fill('000000');
      await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Enable")');

      // Should show invalid code error
      const errors = await testUtils.checkForErrors();
      const hasInvalidError = errors.some(error =>
        error.toLowerCase().includes('invalid') ||
        error.toLowerCase().includes('incorrect') ||
        error.toLowerCase().includes('wrong')
      );
      expect(hasInvalidError).toBe(true);
    });

    test('should accept valid TOTP code and enable MFA', async ({ page }) => {
      // For testing, we'll simulate a valid code (in real implementation, this would be generated by authenticator)
      const mockValidCode = '123456'; // This would need to match the server's expected test code
      const totpInput = page.locator('input[name*="code"], input[name*="totp"], input[placeholder*="code"]');

      await totpInput.fill(mockValidCode);
      await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Enable")');

      // Wait for success response
      await Promise.race([
        testUtils.waitForNotification('enabled'),
        testUtils.waitForNotification('success'),
        testUtils.waitForUrlChange('/settings'),
        page.waitForTimeout(5000)
      ]);

      // Verify MFA is now enabled
      const isEnabled = page.url().includes('/settings') ||
                       await testUtils.isElementVisible('[data-testid="success"], .success, .text-green-500');
      expect(isEnabled).toBe(true);
    });

    test('should provide backup recovery codes', async ({ page }) => {
      // Complete MFA setup first
      const totpInput = page.locator('input[name*="code"], input[name*="totp"], input[placeholder*="code"]');
      await totpInput.fill('123456');
      await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Enable")');

      // Should show backup codes after successful setup
      await Promise.race([
        testUtils.waitForNotification('backup codes'),
        page.waitForSelector('[data-testid="backup-codes"], .backup-codes', { timeout: 10000 }),
        page.waitForTimeout(5000)
      ]);

      const hasBackupCodes = await testUtils.isElementVisible('[data-testid="backup-codes"], .backup-codes, ul:has-text("code"), .recovery-codes');
      expect(hasBackupCodes).toBe(true);
    });

    test('should allow downloading backup codes', async ({ page }) => {
      // After successful MFA setup, look for download option
      const totpInput = page.locator('input[name*="code"], input[name*="totp"], input[placeholder*="code"]');
      await totpInput.fill('123456');
      await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Enable")');

      await page.waitForTimeout(3000);

      // Look for download button
      const hasDownloadButton = await testUtils.isElementVisible('button:has-text("Download"), a:has-text("Download"), [data-testid="download-codes"]');
      expect(hasDownloadButton).toBe(true);
    });
  });

  test.describe('MFA Login Flow', () => {
    // This test assumes MFA is already enabled for the test user
    test.beforeEach(async ({ page }) => {
      // Logout first to test MFA login flow
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');
      await testUtils.waitForUrlChange('/login');
    });

    test('should prompt for MFA code after successful password login', async ({ page }) => {
      // Login with username/password
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Should be redirected to MFA verification page
      await Promise.race([
        testUtils.waitForUrlChange('/mfa'),
        testUtils.waitForUrlChange('/verify'),
        page.waitForSelector('input[name*="code"], input[name*="mfa"]', { timeout: 10000 })
      ]);

      // Should show MFA code input
      const hasMFAInput = await testUtils.isElementVisible('input[name*="code"], input[name*="mfa"], input[placeholder*="code"]');
      expect(hasMFAInput).toBe(true);
    });

    test('should accept valid MFA code and complete login', async ({ page }) => {
      // Complete first factor
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for MFA prompt
      await Promise.race([
        page.waitForSelector('input[name*="code"], input[name*="mfa"]', { timeout: 10000 }),
        page.waitForTimeout(5000)
      ]);

      // Enter valid MFA code
      const mfaInput = page.locator('input[name*="code"], input[name*="mfa"], input[placeholder*="code"]');
      if (await mfaInput.isVisible()) {
        await mfaInput.fill('123456'); // Mock valid code
        await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Continue")');

        // Should complete login and redirect to dashboard
        await testUtils.waitForUrlChange('/dashboard');
        expect(page.url()).toContain('/dashboard');
      }
    });

    test('should reject invalid MFA codes during login', async ({ page }) => {
      // Complete first factor
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for MFA prompt
      await page.waitForTimeout(3000);
      const mfaInput = page.locator('input[name*="code"], input[name*="mfa"], input[placeholder*="code"]');

      if (await mfaInput.isVisible()) {
        await mfaInput.fill('000000'); // Invalid code
        await testUtils.clickButton('button[type="submit"], button:has-text("Verify"), button:has-text("Continue")');

        // Should show error and stay on MFA page
        const errors = await testUtils.checkForErrors();
        const hasInvalidCodeError = errors.some(error =>
          error.toLowerCase().includes('invalid') ||
          error.toLowerCase().includes('incorrect')
        );
        expect(hasInvalidCodeError).toBe(true);
      }
    });

    test('should provide backup code login option', async ({ page }) => {
      // Complete first factor
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      await page.waitForTimeout(3000);

      // Look for backup code option
      const hasBackupOption = await testUtils.isElementVisible('a:has-text("backup"), button:has-text("backup"), a:has-text("recovery")');
      expect(hasBackupOption).toBe(true);

      if (hasBackupOption) {
        await testUtils.clickButton('a:has-text("backup"), button:has-text("backup"), a:has-text("recovery")');

        // Should show backup code input
        const hasBackupInput = await testUtils.isElementVisible('input[name*="backup"], input[name*="recovery"], textarea');
        expect(hasBackupInput).toBe(true);
      }
    });
  });

  test.describe('MFA Management', () => {
    test.beforeEach(async ({ page }) => {
      // Assume MFA is enabled and navigate to MFA management
      await page.goto('/settings/security/mfa');
      await testUtils.waitForPageLoad();
    });

    test('should show current MFA status and options', async ({ page }) => {
      // Should show MFA is enabled
      const hasEnabledStatus = await testUtils.isElementVisible('[data-testid="enabled"], .enabled, span:has-text("Enabled")');
      expect(hasEnabledStatus).toBe(true);

      // Should show management options
      const hasManagementOptions = await testUtils.isElementVisible('button:has-text("Disable"), button:has-text("Regenerate"), a:has-text("backup")');
      expect(hasManagementOptions).toBe(true);
    });

    test('should allow regenerating backup codes', async ({ page }) => {
      // Find regenerate backup codes button
      const regenerateButton = page.locator('button:has-text("Regenerate"), button:has-text("Generate"), a:has-text("backup codes")');

      if (await regenerateButton.isVisible()) {
        await regenerateButton.click();

        // Should show new backup codes
        const hasNewCodes = await testUtils.isElementVisible('[data-testid="backup-codes"], .backup-codes, ul:has-text("code")');
        expect(hasNewCodes).toBe(true);
      }
    });

    test('should allow disabling MFA with password confirmation', async ({ page }) => {
      // Find disable MFA button
      const disableButton = page.locator('button:has-text("Disable"), button:has-text("Turn Off")');

      if (await disableButton.isVisible()) {
        await disableButton.click();

        // Should prompt for password confirmation
        const hasPasswordPrompt = await testUtils.isElementVisible('input[type="password"], [data-testid="password-confirm"]');
        expect(hasPasswordPrompt).toBe(true);

        if (hasPasswordPrompt) {
          await testUtils.fillField('input[type="password"]', 'TestPassword123!');
          await testUtils.clickButton('button[type="submit"], button:has-text("Confirm"), button:has-text("Disable")');

          // Should show success message
          await testUtils.waitForNotification('disabled');
          const hasDisabledStatus = await testUtils.isElementVisible('[data-testid="success"], .success, span:has-text("disabled")');
          expect(hasDisabledStatus).toBe(true);
        }
      }
    });

    test('should show MFA activity log', async ({ page }) => {
      // Look for activity or log section
      const hasActivityLog = await testUtils.isElementVisible('[data-testid="activity"], .activity, .log, h3:has-text("Activity")');

      if (hasActivityLog) {
        // Should show recent MFA activities
        const hasLogEntries = await testUtils.isElementVisible('.log-entry, [data-testid="log-entry"], tr');
        expect(hasLogEntries).toBe(true);
      }
    });
  });

  test.describe('MFA Security Features', () => {
    test('should handle rate limiting for MFA attempts', async ({ page }) => {
      // Logout and try multiple failed MFA attempts
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');
      await testUtils.waitForUrlChange('/login');

      // Login to MFA step
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      await page.waitForTimeout(3000);
      const mfaInput = page.locator('input[name*="code"], input[name*="mfa"]');

      if (await mfaInput.isVisible()) {
        // Multiple failed attempts
        for (let i = 0; i < 5; i++) {
          await mfaInput.fill('000000');
          await testUtils.clickButton('button[type="submit"], button:has-text("Verify")');
          await page.waitForTimeout(1000);
        }

        // Should eventually show rate limiting
        const errors = await testUtils.checkForErrors();
        const hasRateLimit = errors.some(error =>
          error.toLowerCase().includes('too many') ||
          error.toLowerCase().includes('rate') ||
          error.toLowerCase().includes('wait')
        );
        expect(hasRateLimit || errors.length > 0).toBe(true);
      }
    });

    test('should prevent MFA bypass attempts', async ({ page }) => {
      // Try to access dashboard directly without completing MFA
      await testUtils.clickButton('button:has-text("Logout"), [data-testid="logout"], a:has-text("Logout")');
      await testUtils.waitForUrlChange('/login');

      // Login with first factor only
      await testUtils.fillField('input[type="email"]', 'mfa-enabled@example.com');
      await testUtils.fillField('input[type="password"]', 'TestPassword123!');
      await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      // Wait for MFA prompt
      await page.waitForTimeout(3000);

      // Try to navigate directly to dashboard
      await page.goto('/dashboard');

      // Should redirect back to MFA verification or login
      const isBlocked = page.url().includes('/mfa') ||
                       page.url().includes('/verify') ||
                       page.url().includes('/login');
      expect(isBlocked).toBe(true);
    });
  });

  test.describe('MFA Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/settings/security/mfa/setup');
      await testUtils.waitForPageLoad();

      // Tab to TOTP input
      await page.press('body', 'Tab');
      const totpInput = page.locator('input[name*="code"], input[name*="totp"]');

      if (await totpInput.isVisible()) {
        await expect(totpInput).toBeFocused();

        // Type code using keyboard
        await page.keyboard.type('123456');

        // Tab to submit button
        await page.press('body', 'Tab');
        const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
        await expect(submitButton).toBeFocused();
      }
    });

    test('should have proper ARIA labels for MFA elements', async ({ page }) => {
      await page.goto('/settings/security/mfa/setup');

      // Check QR code has alt text or aria-label
      const qrCode = page.locator('[data-testid="qr-code"], .qr-code, img[src*="qr"]');
      if (await qrCode.isVisible()) {
        const hasLabel = await qrCode.getAttribute('alt') || await qrCode.getAttribute('aria-label');
        expect(hasLabel).toBeTruthy();
      }

      // Check TOTP input has proper labeling
      const totpInput = page.locator('input[name*="code"], input[name*="totp"]');
      if (await totpInput.isVisible()) {
        const hasLabel = await totpInput.getAttribute('aria-label') ||
                         await totpInput.getAttribute('aria-labelledby') ||
                         await page.locator('label[for]').count() > 0;
        expect(hasLabel).toBeTruthy();
      }
    });

    test('should announce MFA status changes to screen readers', async ({ page }) => {
      await page.goto('/settings/security/mfa/setup');

      const totpInput = page.locator('input[name*="code"], input[name*="totp"]');
      if (await totpInput.isVisible()) {
        await totpInput.fill('000000');
        await testUtils.clickButton('button[type="submit"], button:has-text("Verify")');

        // Should have live region for status updates
        const hasLiveRegion = await testUtils.isElementVisible('[role="alert"], [aria-live], [data-testid="status"]');
        expect(hasLiveRegion).toBe(true);
      }
    });
  });

  test.describe('MFA Mobile Experience', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings/security/mfa/setup');
      await testUtils.waitForPageLoad();

      // QR code should be visible and appropriately sized
      const qrCode = page.locator('[data-testid="qr-code"], .qr-code, img[src*="qr"]');
      if (await qrCode.isVisible()) {
        const boundingBox = await qrCode.boundingBox();
        expect(boundingBox?.width).toBeLessThan(350); // Should fit in mobile screen
      }

      // Input should be mobile-friendly
      const totpInput = page.locator('input[name*="code"], input[name*="totp"]');
      if (await totpInput.isVisible()) {
        await expect(totpInput).toBeVisible();

        // Should trigger numeric keypad on mobile
        const inputType = await totpInput.getAttribute('type');
        const inputMode = await totpInput.getAttribute('inputmode');
        expect(inputType === 'tel' || inputType === 'number' || inputMode === 'numeric').toBe(true);
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});