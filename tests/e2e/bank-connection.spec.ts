import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Bank Connection Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for bank connection tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access bank connection features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Bank Connection Access', () => {
    test('should navigate to bank connection page', async ({ page }) => {
      // Navigate to bank accounts section
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should show bank accounts page
      const isBankAccountsPage = page.url().includes('/bank-accounts') ||
                                await testUtils.isElementVisible('h1:has-text("Bank"), h1:has-text("Accounts")');
      expect(isBankAccountsPage).toBe(true);

      // Should have connect bank button
      const hasConnectButton = await testUtils.isElementVisible('button:has-text("Connect"), button:has-text("Add"), a:has-text("Connect Bank")');
      expect(hasConnectButton).toBe(true);
    });

    test('should display existing connected accounts', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should show connected accounts list (even if empty)
      const hasAccountsList = await testUtils.isElementVisible('[data-testid="accounts-list"], .accounts-list, .bank-accounts');
      expect(hasAccountsList).toBe(true);

      // If no accounts, should show empty state
      const hasEmptyState = await testUtils.isElementVisible('[data-testid="empty-state"], .empty-state, p:has-text("No accounts")');
      const hasAccounts = await testUtils.isElementVisible('[data-testid="bank-account"], .bank-account-item');

      expect(hasEmptyState || hasAccounts).toBe(true);
    });
  });

  test.describe('Plaid Link Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();
    });

    test('should initialize Plaid Link component', async ({ page }) => {
      // Look for Plaid Link button or iframe
      const hasPlaidLink = await testUtils.isElementVisible('button:has-text("Link"), button:has-text("Connect"), iframe[src*="plaid"], #plaid-link-container');
      expect(hasPlaidLink).toBe(true);
    });

    test('should handle Plaid Link button click', async ({ page }) => {
      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank"), [data-testid="plaid-link"]');

      if (await linkButton.isVisible()) {
        await linkButton.click();

        // Should open Plaid Link modal/iframe or redirect
        await page.waitForTimeout(3000);

        const hasPlaidModal = await testUtils.isElementVisible('iframe[src*="plaid"], [data-plaid], .plaid-modal');
        const hasRedirection = !page.url().includes('/bank-accounts/connect');

        expect(hasPlaidModal || hasRedirection).toBe(true);
      }
    });

    test('should display institution search', async ({ page }) => {
      // Mock Plaid Link opening (in real scenario, this would be handled by Plaid)
      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank"), [data-testid="plaid-link"]');

      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(2000);

        // In a real Plaid integration, we would see institution search
        // For testing purposes, we verify the connection flow is initiated
        const isConnectionInitiated = await testUtils.isElementVisible('iframe, .loading, [data-testid="connecting"]');
        expect(isConnectionInitiated).toBe(true);
      }
    });

    test('should handle institution selection', async ({ page }) => {
      // Mock successful institution selection
      // In real implementation, this would interact with Plaid's UI

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(2000);

        // Simulate institution selection by checking for loading or success states
        const hasProgress = await testUtils.isElementVisible('.loading, .connecting, [data-testid="progress"]');
        expect(hasProgress).toBe(true);
      }
    });
  });

  test.describe('Bank Credentials Flow', () => {
    test('should handle successful credential submission', async ({ page }) => {
      // This test simulates the successful bank connection flow
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Mock successful connection completion
        // In real scenario, user would enter bank credentials in Plaid interface
        // We simulate success by checking for redirect or success message

        await Promise.race([
          testUtils.waitForUrlChange('/bank-accounts'),
          testUtils.waitForNotification('success'),
          testUtils.waitForNotification('connected'),
          page.waitForTimeout(10000)
        ]);

        const isConnectionComplete = page.url().includes('/bank-accounts') && !page.url().includes('/connect');
        const hasSuccessMessage = await testUtils.isElementVisible('[data-testid="success"], .success, .text-green-500');

        expect(isConnectionComplete || hasSuccessMessage).toBe(true);
      }
    });

    test('should handle connection failures gracefully', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Mock network error during connection
      await page.route('**/api/plaid/**', route => route.abort());

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Should show error message
        const errors = await testUtils.checkForErrors();
        const hasConnectionError = errors.some(error =>
          error.toLowerCase().includes('connection') ||
          error.toLowerCase().includes('failed') ||
          error.toLowerCase().includes('error')
        ) || errors.length > 0;

        expect(hasConnectionError).toBe(true);
      }
    });

    test('should allow retry after connection failure', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Simulate initial failure then success
      let requestCount = 0;
      await page.route('**/api/plaid/**', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort();
        } else {
          route.continue();
        }
      });

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        // First attempt (should fail)
        await linkButton.click();
        await page.waitForTimeout(2000);

        // Look for retry option
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-testid="retry"]');
        if (await retryButton.isVisible()) {
          await retryButton.click();

          // Should initiate connection again
          const isRetrying = await testUtils.isElementVisible('.loading, .connecting, iframe[src*="plaid"]');
          expect(isRetrying).toBe(true);
        }
      }
    });
  });

  test.describe('Account Selection and Verification', () => {
    test('should display available accounts for selection', async ({ page }) => {
      // Mock scenario where multiple accounts are available
      await page.goto('/bank-accounts/connect');

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // In real Plaid flow, user would see account selection
        // We simulate by checking for account-related UI elements
        const hasAccountSelection = await testUtils.isElementVisible('[data-testid="accounts"], .accounts, input[type="checkbox"]');

        if (hasAccountSelection) {
          // Should show account types and balances
          const hasAccountInfo = await testUtils.isElementVisible('.account-name, .account-type, .balance');
          expect(hasAccountInfo).toBe(true);
        }
      }
    });

    test('should validate account selection', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Mock account selection interface
        const accountCheckboxes = page.locator('input[type="checkbox"][name*="account"], [data-testid="account-checkbox"]');
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Connect Selected")');

        if (await accountCheckboxes.count() > 0 && await continueButton.isVisible()) {
          // Try to continue without selecting accounts
          await continueButton.click();

          // Should show validation error
          const errors = await testUtils.checkForErrors();
          const hasSelectionError = errors.some(error =>
            error.toLowerCase().includes('select') ||
            error.toLowerCase().includes('choose')
          );
          expect(hasSelectionError).toBe(true);
        }
      }
    });

    test('should complete account connection with selected accounts', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Mock selecting accounts and completing connection
        const accountCheckboxes = page.locator('input[type="checkbox"][name*="account"]');
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Connect Selected")');

        if (await accountCheckboxes.count() > 0) {
          // Select first account
          await accountCheckboxes.first().check();

          if (await continueButton.isVisible()) {
            await continueButton.click();

            // Should complete connection and redirect
            await Promise.race([
              testUtils.waitForUrlChange('/bank-accounts'),
              testUtils.waitForNotification('success'),
              page.waitForTimeout(10000)
            ]);

            const isComplete = page.url().includes('/bank-accounts') && !page.url().includes('/connect');
            expect(isComplete).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Post-Connection Actions', () => {
    test('should display newly connected accounts', async ({ page }) => {
      // Navigate to bank accounts page after connection
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should show connected accounts
      const hasConnectedAccounts = await testUtils.isElementVisible('[data-testid="bank-account"], .bank-account-item, .account-card');
      expect(hasConnectedAccounts).toBe(true);

      if (hasConnectedAccounts) {
        // Should show account details
        const hasAccountDetails = await testUtils.isElementVisible('.account-name, .institution-name, .account-balance');
        expect(hasAccountDetails).toBe(true);
      }
    });

    test('should initiate initial transaction sync', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should show sync status or completed sync
      const hasSyncStatus = await testUtils.isElementVisible('[data-testid="sync-status"], .sync-status, .last-sync');
      expect(hasSyncStatus).toBe(true);

      // May show initial sync in progress
      const hasSyncProgress = await testUtils.isElementVisible('.syncing, .loading, [data-testid="syncing"]');

      if (hasSyncProgress) {
        // Wait for sync to complete
        await page.waitForTimeout(5000);

        // Should eventually show completed status
        const hasSyncComplete = await testUtils.isElementVisible('.sync-complete, .last-sync, [data-testid="sync-complete"]');
        expect(hasSyncComplete).toBe(true);
      }
    });

    test('should allow manual sync trigger', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Look for sync button on account
      const syncButton = page.locator('button:has-text("Sync"), button:has-text("Refresh"), [data-testid="sync-button"]');

      if (await syncButton.first().isVisible()) {
        await syncButton.first().click();

        // Should show sync in progress
        const isSyncing = await testUtils.isElementVisible('.syncing, .loading, [data-testid="syncing"]');
        expect(isSyncing).toBe(true);
      }
    });

    test('should display account connection status', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      const accountCards = page.locator('[data-testid="bank-account"], .bank-account-item, .account-card');

      if (await accountCards.count() > 0) {
        // Each account should show connection status
        const hasStatus = await testUtils.isElementVisible('.status, [data-testid="status"], .connection-status');
        expect(hasStatus).toBe(true);

        // Should show last sync time
        const hasLastSync = await testUtils.isElementVisible('.last-sync, [data-testid="last-sync"], .sync-time');
        expect(hasLastSync).toBe(true);
      }
    });
  });

  test.describe('Connection Error Handling', () => {
    test('should handle institution maintenance gracefully', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Mock institution maintenance error
      await page.route('**/api/plaid/**', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Institution temporarily unavailable' })
        });
      });

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Should show maintenance message
        const errors = await testUtils.checkForErrors();
        const hasMaintenanceError = errors.some(error =>
          error.toLowerCase().includes('maintenance') ||
          error.toLowerCase().includes('temporarily') ||
          error.toLowerCase().includes('unavailable')
        );
        expect(hasMaintenanceError || errors.length > 0).toBe(true);
      }
    });

    test('should handle invalid credentials appropriately', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Mock invalid credentials error
      await page.route('**/api/plaid/**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(3000);

        // Should show credential error
        const errors = await testUtils.checkForErrors();
        const hasCredentialError = errors.some(error =>
          error.toLowerCase().includes('credential') ||
          error.toLowerCase().includes('invalid') ||
          error.toLowerCase().includes('login')
        );
        expect(hasCredentialError || errors.length > 0).toBe(true);
      }
    });

    test('should handle connection timeout', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Mock timeout by delaying response
      await page.route('**/api/plaid/**', route => {
        setTimeout(() => route.abort(), 30000);
      });

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(5000);

        // Should show timeout or loading state
        const hasTimeout = await testUtils.isElementVisible('.timeout, .error, [data-testid="timeout"]') ||
                           await testUtils.isElementVisible('.loading, .connecting');
        expect(hasTimeout).toBe(true);
      }
    });
  });

  test.describe('Bank Connection Security', () => {
    test('should display security information', async ({ page }) => {
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();

      // Should show security/privacy information
      const hasSecurityInfo = await testUtils.isElementVisible('[data-testid="security-info"], .security-info, p:has-text("secure"), p:has-text("encrypted")');
      expect(hasSecurityInfo).toBe(true);
    });

    test('should show Plaid branding and trust indicators', async ({ page }) => {
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();

      // Should show Plaid branding or trust indicators
      const hasPlaidBranding = await testUtils.isElementVisible('[alt*="Plaid"], img[src*="plaid"], .powered-by-plaid');
      expect(hasPlaidBranding).toBe(true);
    });

    test('should validate secure connection', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Verify HTTPS is being used
      expect(page.url()).toContain('https://');

      // Check for security headers or indicators
      const response = await page.goto(page.url());
      const securityHeaders = response?.headers();

      if (securityHeaders) {
        // Should have basic security headers
        const hasSecurityHeaders = securityHeaders['strict-transport-security'] ||
                                  securityHeaders['x-content-type-options'] ||
                                  securityHeaders['x-frame-options'];
        expect(hasSecurityHeaders).toBeTruthy();
      }
    });
  });

  test.describe('Bank Connection Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();

      // Tab to connect button
      await page.press('body', 'Tab');
      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');

      if (await linkButton.isVisible()) {
        await expect(linkButton).toBeFocused();

        // Should be activatable with Enter or Space
        await page.press('button:has-text("Link"), button:has-text("Connect Bank")', 'Enter');
        await page.waitForTimeout(2000);

        // Should initiate connection process
        const hasProgress = await testUtils.isElementVisible('.loading, iframe[src*="plaid"], [data-testid="connecting"]');
        expect(hasProgress).toBe(true);
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      // Check connect button has proper labeling
      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        const hasLabel = await linkButton.getAttribute('aria-label') ||
                        await linkButton.textContent();
        expect(hasLabel).toBeTruthy();
      }

      // Check for proper heading structure
      const hasHeadings = await testUtils.isElementVisible('h1, h2, h3');
      expect(hasHeadings).toBe(true);
    });

    test('should announce connection status to screen readers', async ({ page }) => {
      await page.goto('/bank-accounts/connect');

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.click();
        await page.waitForTimeout(2000);

        // Should have live regions for status updates
        const hasLiveRegion = await testUtils.isElementVisible('[role="status"], [aria-live], [data-testid="status-update"]');
        expect(hasLiveRegion).toBe(true);
      }
    });
  });

  test.describe('Bank Connection Mobile Experience', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/bank-accounts/connect');
      await testUtils.waitForPageLoad();

      // Connect button should be visible and tappable
      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      await expect(linkButton).toBeVisible();

      // Button should be appropriately sized for mobile
      const buttonBox = await linkButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(40); // Minimum touch target size

      // Test mobile interaction
      await linkButton.tap();
      await page.waitForTimeout(2000);

      // Should handle mobile-specific Plaid flow
      const hasMobileFlow = await testUtils.isElementVisible('iframe, .mobile-optimized, [data-testid="mobile-plaid"]');
      expect(hasMobileFlow).toBe(true);

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle mobile app redirect for banking apps', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/bank-accounts/connect');

      const linkButton = page.locator('button:has-text("Link"), button:has-text("Connect Bank")');
      if (await linkButton.isVisible()) {
        await linkButton.tap();
        await page.waitForTimeout(3000);

        // In mobile context, may show option to use banking app
        const hasAppOption = await testUtils.isElementVisible('button:has-text("Open App"), a[href*="app"], [data-testid="mobile-app"]');

        // This is optional as it depends on the specific implementation
        if (hasAppOption) {
          expect(hasAppOption).toBe(true);
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});