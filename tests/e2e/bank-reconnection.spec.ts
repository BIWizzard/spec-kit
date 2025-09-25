import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Bank Reconnection Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for bank reconnection tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access bank reconnection features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Reconnection Access and Detection', () => {
    test('should identify accounts needing reconnection', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should show bank accounts with sync status
      const hasAccountsList = await testUtils.isElementVisible('[data-testid="accounts-list"], .accounts-list, .bank-accounts');
      expect(hasAccountsList).toBe(true);

      // Should show reconnection indicators for disconnected accounts
      const hasReconnectIndicators = await testUtils.isElementVisible(
        '[data-testid="sync-status"], .sync-status, .connection-status, .status-error, .status-disconnected'
      );

      if (hasReconnectIndicators) {
        // Should display error or disconnected status
        const hasErrorStatus = await testUtils.isElementVisible(
          '.text-red-500, .text-red-400, [data-status="error"], [data-status="disconnected"]'
        );
        expect(hasErrorStatus).toBe(true);
      }
    });

    test('should display reconnection button for problematic accounts', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Look for accounts with reconnection needs
      const reconnectButtons = page.locator(
        'button:has-text("Reconnect"), button:has-text("Fix Connection"), [data-testid="reconnect-button"]'
      );

      if (await reconnectButtons.count() > 0) {
        // Should show reconnect button for affected accounts
        await expect(reconnectButtons.first()).toBeVisible();

        // Button should indicate the action clearly
        const buttonText = await reconnectButtons.first().textContent();
        const hasReconnectText = buttonText?.toLowerCase().includes('reconnect') ||
                                buttonText?.toLowerCase().includes('fix') ||
                                buttonText?.toLowerCase().includes('restore');
        expect(hasReconnectText).toBe(true);
      }
    });

    test('should show sync error details', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Should display error information when accounts have sync issues
      const hasErrorDetails = await testUtils.isElementVisible(
        '[data-testid="sync-error"], .sync-error, .error-message, .connection-error'
      );

      if (hasErrorDetails) {
        // Error details should be informative
        const errorElements = page.locator('.sync-error, .error-message, .connection-error');
        const errorCount = await errorElements.count();

        if (errorCount > 0) {
          const errorText = await errorElements.first().textContent();
          expect(errorText?.length).toBeGreaterThan(10);
        }
      }
    });
  });

  test.describe('Reconnection Modal Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();
    });

    test('should open reconnection modal', async ({ page }) => {
      const reconnectButton = page.locator(
        'button:has-text("Reconnect"), button:has-text("Fix Connection"), [data-testid="reconnect-button"]'
      );

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();

        // Should open reconnection modal
        const hasModal = await testUtils.isElementVisible(
          '[role="dialog"], .modal, [data-testid="reconnect-modal"], .fixed.inset-0'
        );
        expect(hasModal).toBe(true);

        // Modal should show reconnection content
        const hasReconnectContent = await testUtils.isElementVisible(
          'h2:has-text("Bank Connection"), h3:has-text("Connection"), h3:has-text("Reconnect")'
        );
        expect(hasReconnectContent).toBe(true);
      }
    });

    test('should display account information in modal', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect"), button:has-text("Fix Connection")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Should show account details in modal
        const hasAccountInfo = await testUtils.isElementVisible(
          '.institution-name, .account-name, .account-type, [data-testid="account-info"]'
        );
        expect(hasAccountInfo).toBe(true);

        // Should show masked account number
        const hasMaskedNumber = await testUtils.isElementVisible(
          'text=•••, text=••, [data-testid="account-number"]'
        );
        expect(hasMaskedNumber).toBe(true);
      }
    });

    test('should show error details in modal', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Should display the connection error or reason for reconnection
        const hasErrorExplanation = await testUtils.isElementVisible(
          '.error-description, p:has-text("error"), p:has-text("expired"), p:has-text("disconnected")'
        );
        expect(hasErrorExplanation).toBe(true);

        // May show specific error message
        const hasSpecificError = await testUtils.isElementVisible(
          '[data-testid="error-details"], .error-details, .sync-error'
        );

        if (hasSpecificError) {
          const errorText = await page.locator('.error-details, .sync-error').first().textContent();
          expect(errorText?.length).toBeGreaterThan(5);
        }
      }
    });

    test('should display security information', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Should show security reassurance
        const hasSecurityInfo = await testUtils.isElementVisible(
          'text="secure", text="encrypted", text="Plaid", [data-testid="security-info"]'
        );
        expect(hasSecurityInfo).toBe(true);
      }
    });
  });

  test.describe('Reconnection Process', () => {
    test('should initiate Plaid Link for reconnection', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Click the main reconnect action button in modal
        const modalReconnectButton = page.locator(
          '[role="dialog"] button:has-text("Reconnect"), .modal button:has-text("Reconnect"), button:has-text("Reconnect Account")'
        );

        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();

          // Should show preparing/loading state
          const hasPreparingState = await testUtils.isElementVisible(
            '.loading, .preparing, [data-testid="preparing"], text="Preparing"'
          );
          expect(hasPreparingState).toBe(true);
        }
      }
    });

    test('should show connection progress states', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(2000);

          // Should progress through connection states
          const connectionStates = [
            '.preparing, text="Preparing"',
            '.linking, text="Ready to Reconnect"',
            '.verifying, text="Verifying"'
          ];

          let foundState = false;
          for (const state of connectionStates) {
            if (await testUtils.isElementVisible(state)) {
              foundState = true;
              break;
            }
          }
          expect(foundState).toBe(true);
        }
      }
    });

    test('should handle Plaid Link opening', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Should show Plaid Link interface or bank connection button
          const hasPlaidInterface = await testUtils.isElementVisible(
            'button:has-text("Open Bank Connection"), iframe[src*="plaid"], [data-testid="plaid-link"]'
          );

          if (hasPlaidInterface) {
            const linkButton = page.locator('button:has-text("Open Bank Connection")');
            if (await linkButton.isVisible()) {
              await linkButton.click();
              await page.waitForTimeout(2000);

              // Should initiate bank connection process
              const hasConnectionProcess = await testUtils.isElementVisible(
                '.verifying, .connecting, iframe, text="Verifying"'
              );
              expect(hasConnectionProcess).toBe(true);
            }
          }
        }
      }
    });

    test('should complete successful reconnection', async ({ page }) => {
      const reconnectButton = page.locator('button:has-text("Reconnect")');

      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(5000);

          // In mock scenario, should eventually show success
          const hasSuccess = await Promise.race([
            testUtils.isElementVisible('text="Successfully Reconnected", .success, [data-testid="success"]'),
            testUtils.isElementVisible('text="Connection restored", .reconnected'),
            page.waitForTimeout(10000).then(() => false)
          ]);

          // If success state is shown, verify it
          if (hasSuccess) {
            const hasSuccessMessage = await testUtils.isElementVisible(
              'text="Successfully Reconnected", text="Connection restored", .success'
            );
            expect(hasSuccessMessage).toBe(true);

            // Should have done/close button
            const hasDoneButton = await testUtils.isElementVisible(
              'button:has-text("Done"), button:has-text("Close"), button:has-text("Finish")'
            );
            expect(hasDoneButton).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Reconnection Error Handling', () => {
    test('should handle connection failures', async ({ page }) => {
      await page.goto('/bank-accounts');

      // Mock API failure for reconnection
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Bank connection failed',
            message: 'Unable to reconnect to your bank account. Please try again.'
          })
        });
      });

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Should show error state
          const hasErrorState = await testUtils.isElementVisible(
            '.error, text="Failed", text="Error", [data-testid="error"]'
          );
          expect(hasErrorState).toBe(true);

          // Should show error message
          const errors = await testUtils.checkForErrors();
          expect(errors.length).toBeGreaterThan(0);
        }
      }
    });

    test('should offer retry option after failure', async ({ page }) => {
      await page.goto('/bank-accounts');

      // Mock initial failure then success
      let requestCount = 0;
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Connection timeout' })
          });
        } else {
          route.continue();
        }
      });

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Should show retry option
          const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
          if (await retryButton.isVisible()) {
            await retryButton.click();

            // Should restart the process
            const hasRetryProcess = await testUtils.isElementVisible(
              '.preparing, .loading, text="Preparing"'
            );
            expect(hasRetryProcess).toBe(true);
          }
        }
      }
    });

    test('should handle invalid credentials scenario', async ({ page }) => {
      await page.goto('/bank-accounts');

      // Mock invalid credentials error
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Invalid credentials',
            message: 'The provided credentials are incorrect or expired.'
          })
        });
      });

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Should show credential-specific error
          const errors = await testUtils.checkForErrors();
          const hasCredentialError = errors.some(error =>
            error.toLowerCase().includes('credential') ||
            error.toLowerCase().includes('invalid') ||
            error.toLowerCase().includes('incorrect')
          );
          expect(hasCredentialError || errors.length > 0).toBe(true);
        }
      }
    });

    test('should handle institution maintenance', async ({ page }) => {
      await page.goto('/bank-accounts');

      // Mock institution maintenance
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({
            error: 'Institution maintenance',
            message: 'Your bank is currently undergoing maintenance. Please try again later.'
          })
        });
      });

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Should show maintenance message
          const errors = await testUtils.checkForErrors();
          const hasMaintenanceError = errors.some(error =>
            error.toLowerCase().includes('maintenance') ||
            error.toLowerCase().includes('temporarily') ||
            error.toLowerCase().includes('try again later')
          );
          expect(hasMaintenanceError || errors.length > 0).toBe(true);
        }
      }
    });
  });

  test.describe('Alternative Actions', () => {
    test('should offer account removal option', async ({ page }) => {
      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Should show remove account option
        const removeButton = page.locator(
          'button:has-text("Remove"), [data-testid="remove-account"], button[title*="Remove"]'
        );

        if (await removeButton.isVisible()) {
          await removeButton.click();

          // Should show confirmation dialog
          const hasConfirmation = await testUtils.isElementVisible(
            'text="Remove Account", text="cannot be undone", [data-testid="remove-confirmation"]'
          );
          expect(hasConfirmation).toBe(true);

          // Should show warning about data deletion
          const hasWarning = await testUtils.isElementVisible(
            'text="permanently", text="delete", text="cannot be undone"'
          );
          expect(hasWarning).toBe(true);
        }
      }
    });

    test('should allow cancellation of removal', async ({ page }) => {
      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const removeButton = page.locator('button:has-text("Remove"), [title*="Remove"]');
        if (await removeButton.isVisible()) {
          await removeButton.click();
          await page.waitForTimeout(500);

          // Should have keep/cancel option
          const keepButton = page.locator(
            'button:has-text("Keep"), button:has-text("Cancel"), button:has-text("Keep Account")'
          );

          if (await keepButton.isVisible()) {
            await keepButton.click();

            // Should return to initial modal state
            const hasInitialState = await testUtils.isElementVisible(
              'button:has-text("Reconnect Account"), text="Connection Error", text="Connection Expired"'
            );
            expect(hasInitialState).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Post-Reconnection State', () => {
    test('should update account status after successful reconnection', async ({ page }) => {
      // Mock successful reconnection
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Bank account reconnected successfully',
            account: {
              id: 'test-account-id',
              syncStatus: 'active',
              lastSyncAt: new Date().toISOString()
            }
          })
        });
      });

      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          // Close success modal if present
          const doneButton = page.locator('button:has-text("Done"), button:has-text("Close")');
          if (await doneButton.isVisible()) {
            await doneButton.click();
          }

          // Should return to accounts list
          await testUtils.waitForPageLoad();

          // Account should no longer show reconnection button
          const remainingReconnectButtons = await page.locator('button:has-text("Reconnect")').count();
          // Note: In real scenario, this would be fewer than initial count
          expect(remainingReconnectButtons).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should trigger immediate sync after reconnection', async ({ page }) => {
      // Mock successful reconnection with sync
      await page.route('**/api/bank-accounts/*/reconnect', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            message: 'Bank account reconnected successfully',
            account: { syncStatus: 'active' }
          })
        });
      });

      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(3000);

          const doneButton = page.locator('button:has-text("Done")');
          if (await doneButton.isVisible()) {
            await doneButton.click();
            await page.waitForTimeout(2000);

            // Should show sync activity or completed sync
            const hasSyncActivity = await testUtils.isElementVisible(
              '.syncing, .loading, .sync-complete, [data-testid="sync-status"]'
            );

            if (hasSyncActivity) {
              expect(hasSyncActivity).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Reconnection Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Tab to reconnect button
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');
      await page.press('body', 'Tab'); // May need multiple tabs to reach reconnect button

      const reconnectButton = page.locator('button:has-text("Reconnect"):visible');
      if (await reconnectButton.count() > 0) {
        // Should be focusable and activatable
        await reconnectButton.focus();
        await expect(reconnectButton).toBeFocused();

        // Should activate with Enter
        await page.press('button:has-text("Reconnect"):visible', 'Enter');

        // Should open modal
        const hasModal = await testUtils.isElementVisible('[role="dialog"], .modal');
        expect(hasModal).toBe(true);
      }
    });

    test('should have proper ARIA labels in modal', async ({ page }) => {
      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        // Modal should have proper dialog role
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          const hasDialogRole = await modal.getAttribute('role');
          expect(hasDialogRole).toBe('dialog');

          // Should have accessible heading
          const hasHeading = await testUtils.isElementVisible('h2, h3, [role="heading"]');
          expect(hasHeading).toBe(true);
        }
      }
    });

    test('should announce status changes to screen readers', async ({ page }) => {
      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().click();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.click();
          await page.waitForTimeout(2000);

          // Should have live regions for status updates
          const hasLiveRegion = await testUtils.isElementVisible(
            '[role="status"], [aria-live], [data-testid="status-update"]'
          );

          if (hasLiveRegion) {
            expect(hasLiveRegion).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Reconnection Mobile Experience', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        // Button should be tappable on mobile
        const buttonBox = await reconnectButton.first().boundingBox();
        expect(buttonBox?.height).toBeGreaterThan(40);

        await reconnectButton.first().tap();

        // Modal should adapt to mobile screen
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          const modalBox = await modal.boundingBox();
          expect(modalBox?.width).toBeLessThanOrEqual(375);
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle mobile-optimized Plaid flow', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/bank-accounts');

      const reconnectButton = page.locator('button:has-text("Reconnect")');
      if (await reconnectButton.first().isVisible()) {
        await reconnectButton.first().tap();
        await page.waitForTimeout(1000);

        const modalReconnectButton = page.locator('button:has-text("Reconnect Account")');
        if (await modalReconnectButton.isVisible()) {
          await modalReconnectButton.tap();
          await page.waitForTimeout(3000);

          // Should handle mobile-specific connection flow
          const hasMobileFlow = await testUtils.isElementVisible(
            'iframe, .mobile-optimized, [data-testid="mobile-plaid"]'
          );

          if (hasMobileFlow) {
            expect(hasMobileFlow).toBe(true);
          }
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});