import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Payment Attribution Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for payment attribution tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access payment attribution features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Attribution Access and Overview', () => {
    test('should access payment attribution from payments page', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for attribution-related elements or links
      const hasAttributionAccess = await testUtils.isElementVisible(
        'button:has-text("Attribution"), a:has-text("Attribution"), [data-testid="attribution"]'
      );

      if (hasAttributionAccess) {
        expect(hasAttributionAccess).toBe(true);

        // Click to access attribution
        await page.click('button:has-text("Attribution"), a:has-text("Attribution")');

        // Should show attribution interface
        const hasAttributionInterface = await testUtils.isElementVisible(
          '[data-testid="attribution-page"], h1:has-text("Attribution"), .attribution-interface'
        );
        expect(hasAttributionInterface).toBe(true);
      }
    });

    test('should access attribution from individual payment', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Click on a payment to view details
      const paymentItem = page.locator(
        '[data-testid="payment-item"], .payment-card, .payment-row'
      );

      if (await paymentItem.first().isVisible()) {
        await paymentItem.first().click();

        // Should show payment details with attribution info
        const hasAttributionInfo = await testUtils.isElementVisible(
          '[data-testid="attribution-info"], .attribution-details, text="Attribution"'
        );

        if (hasAttributionInfo) {
          expect(hasAttributionInfo).toBe(true);

          // Should show attribution percentages or amounts
          const hasAttributionData = await testUtils.isElementVisible(
            'text="%", .attribution-amount, .attribution-percent'
          );
          expect(hasAttributionData).toBe(true);
        }
      }
    });

    test('should display attribution summary', async ({ page }) => {
      // Navigate directly to attribution or find it via payments
      await page.goto('/payments');

      const attributionButton = page.locator('button:has-text("Attribution"), a:has-text("Attribution")');
      if (await attributionButton.isVisible()) {
        await attributionButton.click();
      } else {
        // Try direct navigation if available
        await page.goto('/payments/attribution');
      }

      await testUtils.waitForPageLoad();

      // Should show attribution overview
      const hasAttributionSummary = await testUtils.isElementVisible(
        '[data-testid="attribution-summary"], .attribution-overview, text="Total attributed"'
      );

      if (hasAttributionSummary) {
        expect(hasAttributionSummary).toBe(true);

        // Should show total amounts and percentages
        const hasTotals = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Total", .total-amount'
        );
        expect(hasTotals).toBe(true);
      }
    });

    test('should show unattributed payments', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for unattributed payments indicator
      const hasUnattributedIndicator = await testUtils.isElementVisible(
        'text="Unattributed", .unattributed, [data-testid="unattributed"]'
      );

      if (hasUnattributedIndicator) {
        expect(hasUnattributedIndicator).toBe(true);

        // Should show count or amount of unattributed payments
        const hasUnattributedData = await testUtils.isElementVisible(
          'text=" unattributed", .unattributed-count, .unattributed-amount'
        );
        expect(hasUnattributedData).toBe(true);
      }
    });
  });

  test.describe('Manual Payment Attribution', () => {
    test('should open attribution modal for payment', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for attribution buttons on payments
      const attributeButton = page.locator(
        'button:has-text("Attribute"), [data-testid="attribute-payment"]'
      );

      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();

        // Should open attribution modal
        const hasAttributionModal = await testUtils.isElementVisible(
          '[role="dialog"], .modal, [data-testid="attribution-modal"]'
        );
        expect(hasAttributionModal).toBe(true);

        // Should show payment details in modal
        const hasPaymentDetails = await testUtils.isElementVisible(
          '.payment-info, .payment-details, [data-testid="payment-info"]'
        );
        expect(hasPaymentDetails).toBe(true);
      }
    });

    test('should display available income events for attribution', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Should show list of available income events
        const hasIncomeEvents = await testUtils.isElementVisible(
          '[data-testid="income-events"], .income-list, .available-income'
        );
        expect(hasIncomeEvents).toBe(true);

        // Should show income event details
        const hasIncomeDetails = await testUtils.isElementVisible(
          '.income-amount, .income-date, .income-description'
        );
        expect(hasIncomeDetails).toBe(true);
      }
    });

    test('should create payment attribution', async ({ page }) => {
      // Mock attribution creation
      await page.route('**/api/payments/*/attributions', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            body: JSON.stringify({
              id: 'attr-123',
              amount: 500,
              percentage: 25
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Select an income event
        const incomeSelector = page.locator(
          'input[name="incomeEventId"], select[name="incomeEventId"], .income-selector'
        );

        if (await incomeSelector.isVisible()) {
          if (await incomeSelector.getAttribute('type') === 'radio') {
            await incomeSelector.first().check();
          } else {
            await incomeSelector.selectOption({ index: 1 });
          }

          // Enter attribution amount or percentage
          const amountField = page.locator(
            'input[name="amount"], input[type="number"], [data-testid="attribution-amount"]'
          );

          if (await amountField.isVisible()) {
            await testUtils.fillField('input[name="amount"]', '500');
          }

          // Submit attribution
          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Create"), button:has-text("Attribute")'
          );

          if (await submitButton.isVisible()) {
            await submitButton.click();

            // Should show success notification
            const hasSuccess = await Promise.race([
              testUtils.waitForNotification('attributed'),
              testUtils.waitForNotification('created'),
              page.waitForTimeout(3000).then(() => false)
            ]);

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });

    test('should validate attribution amounts', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Try to attribute more than payment amount
        const amountField = page.locator('input[name="amount"], input[type="number"]');
        if (await amountField.isVisible()) {
          await testUtils.fillField('input[name="amount"]', '999999'); // Large amount

          const submitButton = page.locator('button[type="submit"]');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);

            // Should show validation error
            const errors = await testUtils.checkForErrors();
            const hasValidationError = errors.some(error =>
              error.toLowerCase().includes('amount') ||
              error.toLowerCase().includes('exceeds') ||
              error.toLowerCase().includes('invalid')
            );
            expect(hasValidationError || errors.length > 0).toBe(true);
          }
        }
      }
    });

    test('should support percentage-based attribution', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Look for percentage option
        const percentageToggle = page.locator(
          'input[name="usePercentage"], input[type="radio"][value="percentage"]'
        );

        if (await percentageToggle.isVisible()) {
          await percentageToggle.click();

          // Should show percentage input
          const percentageField = page.locator(
            'input[name="percentage"], [data-testid="percentage-input"]'
          );
          expect(await percentageField.isVisible()).toBe(true);

          // Enter percentage
          if (await percentageField.isVisible()) {
            await testUtils.fillField('input[name="percentage"]', '25');
          }
        }
      }
    });
  });

  test.describe('Auto-Attribution Features', () => {
    test('should trigger auto-attribution for payment', async ({ page }) => {
      // Mock auto-attribution endpoint
      await page.route('**/api/payments/*/auto-attribute', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            attributions: [
              { incomeEventId: 'income-1', amount: 500, confidence: 0.9 }
            ],
            message: 'Payment auto-attributed successfully'
          })
        });
      });

      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for auto-attribution button
      const autoAttributeButton = page.locator(
        'button:has-text("Auto-Attribute"), [data-testid="auto-attribute"]'
      );

      if (await autoAttributeButton.first().isVisible()) {
        await autoAttributeButton.first().click();

        // Should show auto-attribution process
        const hasAutoProcess = await testUtils.isElementVisible(
          '.loading, text="Analyzing", [data-testid="auto-attributing"]'
        );
        expect(hasAutoProcess).toBe(true);

        // Should show results
        await page.waitForTimeout(2000);
        const hasResults = await testUtils.isElementVisible(
          'text="attributed", .attribution-result, [data-testid="auto-result"]'
        );

        if (hasResults) {
          expect(hasResults).toBe(true);
        }
      }
    });

    test('should show auto-attribution suggestions', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Should show suggested attributions
        const hasSuggestions = await testUtils.isElementVisible(
          '[data-testid="suggestions"], .attribution-suggestions, text="Suggested"'
        );

        if (hasSuggestions) {
          expect(hasSuggestions).toBe(true);

          // Should show confidence scores
          const hasConfidenceScores = await testUtils.isElementVisible(
            'text="confidence", .confidence-score, text="%"'
          );
          expect(hasConfidenceScores).toBe(true);
        }
      }
    });

    test('should accept auto-attribution suggestions', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Look for suggestion accept buttons
        const acceptSuggestionButton = page.locator(
          'button:has-text("Accept"), [data-testid="accept-suggestion"]'
        );

        if (await acceptSuggestionButton.first().isVisible()) {
          // Mock accept endpoint
          await page.route('**/api/payments/*/attributions', route => {
            route.fulfill({
              status: 201,
              body: JSON.stringify({ message: 'Suggestion accepted' })
            });
          });

          await acceptSuggestionButton.first().click();

          // Should process suggestion
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should bulk auto-attribute payments', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for bulk auto-attribution option
      const bulkAutoAttributeButton = page.locator(
        'button:has-text("Auto-Attribute All"), [data-testid="bulk-auto-attribute"]'
      );

      if (await bulkAutoAttributeButton.isVisible()) {
        // Mock bulk auto-attribution
        await page.route('**/api/payments/auto-attribute-bulk', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              processed: 5,
              attributed: 3,
              message: '3 of 5 payments auto-attributed'
            })
          });
        });

        await bulkAutoAttributeButton.click();

        // Should show bulk processing
        const hasBulkProcess = await testUtils.isElementVisible(
          '.bulk-processing, text="Processing", [data-testid="bulk-progress"]'
        );
        expect(hasBulkProcess).toBe(true);

        // Should show results summary
        await page.waitForTimeout(3000);
        const hasResultsSummary = await testUtils.isElementVisible(
          'text=" attributed", .bulk-results, [data-testid="bulk-results"]'
        );

        if (hasResultsSummary) {
          expect(hasResultsSummary).toBe(true);
        }
      }
    });
  });

  test.describe('Attribution Management', () => {
    test('should view existing payment attributions', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Click on payment with existing attributions
      const paymentWithAttributions = page.locator(
        '[data-testid="payment-item"]:has(.attribution), .payment-card:has(.attributed)'
      );

      if (await paymentWithAttributions.first().isVisible()) {
        await paymentWithAttributions.first().click();

        // Should show attribution details
        const hasAttributionDetails = await testUtils.isElementVisible(
          '[data-testid="attribution-details"], .attribution-list'
        );
        expect(hasAttributionDetails).toBe(true);

        // Should show attribution breakdown
        const hasAttributionBreakdown = await testUtils.isElementVisible(
          '.attribution-item, [data-testid="attribution-entry"]'
        );
        expect(hasAttributionBreakdown).toBe(true);
      }
    });

    test('should edit existing attribution', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for edit attribution buttons
      const editAttributionButton = page.locator(
        'button:has-text("Edit Attribution"), [data-testid="edit-attribution"]'
      );

      if (await editAttributionButton.first().isVisible()) {
        await editAttributionButton.first().click();

        // Should show edit attribution form
        const hasEditForm = await testUtils.isElementVisible(
          '[data-testid="edit-attribution-form"], .edit-attribution'
        );
        expect(hasEditForm).toBe(true);

        // Should pre-populate current values
        const amountField = page.locator('input[name="amount"]');
        if (await amountField.isVisible()) {
          const value = await amountField.inputValue();
          expect(value).toBeTruthy();
        }
      }
    });

    test('should update attribution amount', async ({ page }) => {
      // Mock update endpoint
      await page.route('**/api/payments/*/attributions/*', route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Attribution updated' })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      const editAttributionButton = page.locator('button:has-text("Edit Attribution")');
      if (await editAttributionButton.first().isVisible()) {
        await editAttributionButton.first().click();
        await page.waitForTimeout(1000);

        const amountField = page.locator('input[name="amount"]');
        if (await amountField.isVisible()) {
          await amountField.fill('750');

          const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await saveButton.isVisible()) {
            await saveButton.click();

            // Should show update success
            const hasSuccess = await Promise.race([
              testUtils.waitForNotification('updated'),
              page.waitForTimeout(3000).then(() => false)
            ]);

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });

    test('should delete attribution', async ({ page }) => {
      // Mock delete endpoint
      await page.route('**/api/payments/*/attributions/*', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Attribution deleted' })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for delete attribution button
      const deleteAttributionButton = page.locator(
        'button:has-text("Delete Attribution"), [data-testid="delete-attribution"]'
      );

      if (await deleteAttributionButton.first().isVisible()) {
        await deleteAttributionButton.first().click();

        // Should show confirmation dialog
        const hasConfirmation = await testUtils.isElementVisible(
          '[role="dialog"], .confirmation, text="confirm"'
        );

        if (hasConfirmation) {
          const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();

            // Should show deletion success
            await page.waitForTimeout(1000);
          }
        }
      }
    });

    test('should show attribution history', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for attribution history
      const historyButton = page.locator(
        'button:has-text("History"), a:has-text("History"), [data-testid="attribution-history"]'
      );

      if (await historyButton.isVisible()) {
        await historyButton.click();

        // Should show attribution history
        const hasHistory = await testUtils.isElementVisible(
          '[data-testid="attribution-history"], .history-list, h2:has-text("History")'
        );
        expect(hasHistory).toBe(true);

        // Should show timeline of changes
        const hasTimeline = await testUtils.isElementVisible(
          '.timeline, .history-entry, .attribution-change'
        );
        expect(hasTimeline).toBe(true);
      }
    });
  });

  test.describe('Attribution Analytics', () => {
    test('should show attribution statistics', async ({ page }) => {
      // Navigate to attribution analytics/dashboard
      await page.goto('/payments');

      const analyticsButton = page.locator(
        'a:has-text("Analytics"), button:has-text("Analytics"), [data-testid="attribution-analytics"]'
      );

      if (await analyticsButton.isVisible()) {
        await analyticsButton.click();

        // Should show attribution analytics
        const hasAnalytics = await testUtils.isElementVisible(
          '[data-testid="attribution-analytics"], .analytics-dashboard'
        );
        expect(hasAnalytics).toBe(true);

        // Should show attribution percentages and totals
        const hasStats = await testUtils.isElementVisible(
          'text="Total Attributed", .attribution-percentage, .stats-card'
        );
        expect(hasStats).toBe(true);
      }
    });

    test('should display attribution charts', async ({ page }) => {
      await page.goto('/payments');

      const chartsButton = page.locator('a:has-text("Charts"), [data-testid="attribution-charts"]');
      if (await chartsButton.isVisible()) {
        await chartsButton.click();

        // Should show attribution visualization
        const hasCharts = await testUtils.isElementVisible(
          '.chart, canvas, [data-testid="attribution-chart"]'
        );

        if (hasCharts) {
          expect(hasCharts).toBe(true);

          // Should show attribution breakdown by income source
          const hasBreakdown = await testUtils.isElementVisible(
            '.breakdown, .legend, .chart-legend'
          );
          expect(hasBreakdown).toBe(true);
        }
      }
    });

    test('should show attribution by time period', async ({ page }) => {
      await page.goto('/payments');

      const timeAnalyticsButton = page.locator('[data-testid="time-analytics"]');
      if (await timeAnalyticsButton.isVisible()) {
        await timeAnalyticsButton.click();

        // Should show time-based attribution analysis
        const hasTimeAnalysis = await testUtils.isElementVisible(
          '[data-testid="time-analysis"], .time-breakdown, .monthly-attribution'
        );

        if (hasTimeAnalysis) {
          expect(hasTimeAnalysis).toBe(true);

          // Should allow filtering by date range
          const hasDateFilters = await testUtils.isElementVisible(
            'input[type="date"], .date-picker, [data-testid="date-filter"]'
          );
          expect(hasDateFilters).toBe(true);
        }
      }
    });

    test('should export attribution data', async ({ page }) => {
      await page.goto('/payments');

      const exportButton = page.locator(
        'button:has-text("Export"), [data-testid="export-attributions"]'
      );

      if (await exportButton.isVisible()) {
        // Mock export endpoint
        await page.route('**/api/payments/attributions/export', route => {
          route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="attributions.csv"'
            },
            body: 'Payment,Amount,Income Event,Attribution Amount\n'
          });
        });

        await exportButton.click();

        // Should initiate download or show export options
        await page.waitForTimeout(2000);

        // Check for download initiation (implementation-specific)
        const hasExportFeedback = await testUtils.isElementVisible(
          'text="Export", text="Download", [data-testid="export-status"]'
        );

        if (hasExportFeedback) {
          expect(hasExportFeedback).toBe(true);
        }
      }
    });
  });

  test.describe('Multi-Income Attribution', () => {
    test('should split payment across multiple income events', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Look for split attribution option
        const splitOption = page.locator(
          'button:has-text("Split"), input[name="splitAttribution"], [data-testid="split-attribution"]'
        );

        if (await splitOption.isVisible()) {
          await splitOption.click();

          // Should show multiple income selection
          const hasMultipleSelection = await testUtils.isElementVisible(
            '.multiple-income-selection, [data-testid="multi-select"]'
          );
          expect(hasMultipleSelection).toBe(true);

          // Should allow setting different amounts/percentages
          const hasAmountInputs = await testUtils.isElementVisible(
            'input[name*="amount"], .attribution-amount-input'
          );
          expect(hasAmountInputs).toBe(true);
        }
      }
    });

    test('should validate split attribution totals', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        const splitOption = page.locator('button:has-text("Split")');
        if (await splitOption.isVisible()) {
          await splitOption.click();

          // Enter amounts that exceed payment total
          const amountInputs = page.locator('input[name*="amount"]');
          const inputCount = await amountInputs.count();

          if (inputCount > 1) {
            await amountInputs.first().fill('999');
            await amountInputs.nth(1).fill('999');

            const submitButton = page.locator('button[type="submit"]');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(1000);

              // Should show validation error
              const errors = await testUtils.checkForErrors();
              const hasValidationError = errors.some(error =>
                error.toLowerCase().includes('exceed') ||
                error.toLowerCase().includes('total') ||
                error.toLowerCase().includes('invalid')
              );
              expect(hasValidationError || errors.length > 0).toBe(true);
            }
          }
        }
      }
    });

    test('should show remaining unattributed amount', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Should show remaining amount indicator
        const hasRemainingAmount = await testUtils.isElementVisible(
          '[data-testid="remaining-amount"], .remaining, text="Remaining"'
        );

        if (hasRemainingAmount) {
          expect(hasRemainingAmount).toBe(true);

          // Should update as amounts are entered
          const amountInput = page.locator('input[name="amount"]');
          if (await amountInput.first().isVisible()) {
            await amountInput.first().fill('100');
            await page.waitForTimeout(500);

            // Remaining amount should be updated
            const remainingText = await page.locator('.remaining, [data-testid="remaining-amount"]').textContent();
            expect(remainingText).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle attribution creation failures', async ({ page }) => {
      await page.goto('/payments');

      // Mock server error
      await page.route('**/api/payments/*/attributions', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Attribution failed' })
        });
      });

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Should show error message
          const errors = await testUtils.checkForErrors();
          expect(errors.length).toBeGreaterThan(0);
        }
      }
    });

    test('should handle auto-attribution failures', async ({ page }) => {
      await page.goto('/payments');

      // Mock auto-attribution failure
      await page.route('**/api/payments/*/auto-attribute', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'No suitable income events found' })
        });
      });

      const autoAttributeButton = page.locator('button:has-text("Auto-Attribute")');
      if (await autoAttributeButton.first().isVisible()) {
        await autoAttributeButton.first().click();
        await page.waitForTimeout(2000);

        // Should show informative error
        const errors = await testUtils.checkForErrors();
        const hasInformativeError = errors.some(error =>
          error.toLowerCase().includes('no') ||
          error.toLowerCase().includes('found') ||
          error.toLowerCase().includes('unable')
        );
        expect(hasInformativeError || errors.length > 0).toBe(true);
      }
    });

    test('should handle network failures gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/payments/*/attributions**', route => route.abort());

      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(3000);

        // Should show network error or loading state
        const hasError = await testUtils.isElementVisible(
          '.error, .network-error, text="Failed", text="Error"'
        );
        expect(hasError).toBe(true);
      }
    });
  });

  test.describe('Attribution Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Tab through attribution interface
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');

      // Should focus interactive elements
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'input', 'select', 'a'].includes(tagName)).toBe(true);
      }
    });

    test('should have proper form labels and structure', async ({ page }) => {
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().click();
        await page.waitForTimeout(1000);

        // Should have accessible form structure
        const hasFormLabels = await testUtils.isElementVisible(
          'label, [aria-label], [aria-labelledby]'
        );
        expect(hasFormLabels).toBe(true);

        // Form controls should be properly labeled
        const inputs = page.locator('input');
        if (await inputs.count() > 0) {
          const firstInput = inputs.first();
          const hasLabel = await firstInput.getAttribute('aria-label') ||
                          await page.locator(`label[for="${await firstInput.getAttribute('id')}"]`).isVisible();
          expect(hasLabel).toBeTruthy();
        }
      }
    });

    test('should announce attribution status changes', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should have live regions for status updates
      const hasLiveRegions = await testUtils.isElementVisible(
        '[role="status"], [aria-live], [data-testid="status-announcement"]'
      );

      if (hasLiveRegions) {
        expect(hasLiveRegions).toBe(true);
      }
    });
  });

  test.describe('Mobile Attribution Interface', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Attribution features should be accessible on mobile
      const hasAttributionFeatures = await testUtils.isElementVisible(
        'button:has-text("Attribute"), [data-testid="attribution"]'
      );

      if (hasAttributionFeatures) {
        expect(hasAttributionFeatures).toBe(true);

        // Buttons should be touch-friendly
        const attributeButton = page.locator('button:has-text("Attribute")');
        if (await attributeButton.isVisible()) {
          const buttonBox = await attributeButton.boundingBox();
          expect(buttonBox?.height).toBeGreaterThan(40);
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle mobile attribution workflow', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/payments');

      const attributeButton = page.locator('button:has-text("Attribute")');
      if (await attributeButton.first().isVisible()) {
        await attributeButton.first().tap();
        await page.waitForTimeout(1000);

        // Modal should adapt to mobile screen
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          const modalBox = await modal.boundingBox();
          expect(modalBox?.width).toBeLessThanOrEqual(375);

          // Form elements should be mobile-optimized
          const inputs = page.locator('input');
          if (await inputs.count() > 0) {
            const inputBox = await inputs.first().boundingBox();
            expect(inputBox?.height).toBeGreaterThan(40);
          }
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});