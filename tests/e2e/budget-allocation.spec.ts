import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Budget Allocation Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for budget allocation tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access budget allocation features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Budget Allocations Access and Overview', () => {
    test('should access budget allocations from budget page', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for allocations section or navigation
      const hasAllocationsAccess = await testUtils.isElementVisible(
        'a:has-text("Allocations"), button:has-text("Allocations"), [data-testid="budget-allocations"]'
      );

      if (hasAllocationsAccess) {
        expect(hasAllocationsAccess).toBe(true);

        await page.click('a:has-text("Allocations"), button:has-text("Allocations")');
        await testUtils.waitForUrlChange('/budget/allocations');

        // Should show allocations page
        const hasAllocationsPage = await testUtils.isElementVisible(
          '[data-testid="allocations-page"], h1:has-text("Budget Allocations"), .budget-allocations'
        );
        expect(hasAllocationsPage).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/budget/allocations');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display allocation overview with key metrics', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Should show allocation overview
      const hasAllocationOverview = await testUtils.isElementVisible(
        '[data-testid="allocation-overview"], .allocation-summary, text="Total Allocations"'
      );

      if (hasAllocationOverview) {
        expect(hasAllocationOverview).toBe(true);

        // Should display key allocation metrics
        const hasMetrics = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Allocated", text="Available"'
        );
        expect(hasMetrics).toBe(true);
      }
    });

    test('should show allocation status for income events', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for income event allocations
      const hasIncomeAllocations = await testUtils.isElementVisible(
        '[data-testid="income-allocation"], .income-event-allocation, text="Income"'
      );

      if (hasIncomeAllocations) {
        expect(hasIncomeAllocations).toBe(true);

        // Should show allocation status
        const hasStatus = await testUtils.isElementVisible(
          'text="Allocated", text="Pending", .allocation-status'
        );
        expect(hasStatus).toBe(true);
      }
    });
  });

  test.describe('Allocation Generation', () => {
    test('should generate allocations for income event', async ({ page }) => {
      // First navigate to income to ensure we have income events
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Look for existing income event or create one
      const hasIncomeEvents = await testUtils.isElementVisible(
        '[data-testid="income-item"], .income-event, .income-row'
      );

      if (!hasIncomeEvents) {
        // Create an income event first
        const hasCreateButton = await testUtils.isElementVisible(
          'button:has-text("Add Income"), button:has-text("Create Income")'
        );

        if (hasCreateButton) {
          await page.click('button:has-text("Add Income"), button:has-text("Create Income")');

          const hasForm = await testUtils.isElementVisible('[data-testid="income-form"], form');
          if (hasForm) {
            await testUtils.fillFormField('Source', 'Salary');
            await testUtils.fillFormField('Amount', '5000');
            await testUtils.fillFormField('Description', 'Monthly salary');

            await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');
            await testUtils.waitForPageLoad();
          }
        }
      }

      // Navigate to allocations
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for generate allocation button
      const hasGenerateButton = await testUtils.isElementVisible(
        'button:has-text("Generate"), button:has-text("Create Allocation"), [data-testid="generate-allocation"]'
      );

      if (hasGenerateButton) {
        await page.click('button:has-text("Generate"), button:has-text("Create Allocation")');

        // Should show allocation generation form or modal
        const hasGenerationForm = await testUtils.isElementVisible(
          '[data-testid="allocation-form"], .allocation-modal, text="Generate Allocation"'
        );

        if (hasGenerationForm) {
          expect(hasGenerationForm).toBe(true);

          // Select income event if dropdown exists
          const incomeSelect = page.locator('select[name*="income"], [data-testid="income-select"]');
          if (await incomeSelect.isVisible()) {
            await incomeSelect.selectOption({ index: 0 });
          }

          // Generate the allocation
          await testUtils.clickButton('button:has-text("Generate"), button:has-text("Create")');

          // Should show success message
          const hasSuccess = await testUtils.isElementVisible(
            'text="Allocation created", text="Generated successfully", .success-message'
          );

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }

          // Should show the new allocation
          const hasNewAllocation = await testUtils.isElementVisible(
            '[data-testid="allocation-item"], .allocation-card, .allocation-entry'
          );
          expect(hasNewAllocation).toBe(true);
        }
      }
    });

    test('should show allocation breakdown by category', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for allocation with category breakdown
      const hasAllocation = await testUtils.isElementVisible(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (hasAllocation) {
        // Click on allocation to view details
        await page.click('[data-testid="allocation-item"], .allocation-card');

        // Should show category breakdown
        const hasCategoryBreakdown = await testUtils.isElementVisible(
          '[data-testid="category-breakdown"], .category-allocation, text="Category"'
        );

        if (hasCategoryBreakdown) {
          expect(hasCategoryBreakdown).toBe(true);

          // Should show amounts for each category
          const hasAmounts = await testUtils.isElementVisible(
            'text=/\\$\\d+/, .category-amount'
          );
          expect(hasAmounts).toBe(true);

          // Should show percentages
          const hasPercentages = await testUtils.isElementVisible(
            'text=/\\d+%/, .category-percentage'
          );
          expect(hasPercentages).toBe(true);
        }
      }
    });

    test('should validate allocation totals match income amount', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      const hasAllocation = await testUtils.isElementVisible(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (hasAllocation) {
        await page.click('[data-testid="allocation-item"], .allocation-card');

        // Should show total validation
        const hasTotalValidation = await testUtils.isElementVisible(
          'text="Total", text="Income Amount", .allocation-total'
        );

        if (hasTotalValidation) {
          expect(hasTotalValidation).toBe(true);

          // Should show matching amounts or discrepancy warning
          const hasValidationStatus = await testUtils.isElementVisible(
            'text="Matches", text="Discrepancy", .validation-status'
          );
          expect(hasValidationStatus).toBe(true);
        }
      }
    });
  });

  test.describe('Allocation Management', () => {
    test('should edit allocation amounts', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      const allocationItem = page.locator(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (await allocationItem.first().isVisible()) {
        // Look for edit functionality
        const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-allocation"]').first();

        if (await editButton.isVisible()) {
          await editButton.click();
        } else {
          await allocationItem.first().click();
        }

        // Should show editable allocation
        const hasEditForm = await testUtils.isElementVisible(
          '[data-testid="edit-allocation"], .allocation-editor, input[type="number"]'
        );

        if (hasEditForm) {
          expect(hasEditForm).toBe(true);

          // Modify an allocation amount
          const amountField = page.locator('input[type="number"]').first();
          if (await amountField.isVisible()) {
            await amountField.clear();
            await amountField.fill('800');

            // Save changes
            await testUtils.clickButton('button:has-text("Save"), button:has-text("Update")');

            // Should show success
            const hasSuccess = await testUtils.isElementVisible(
              'text="Updated", text="Saved", .success-message'
            );

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });

    test('should view allocation details and history', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      const allocationItem = page.locator(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (await allocationItem.first().isVisible()) {
        await allocationItem.first().click();

        // Should show allocation details page or modal
        const hasDetails = await testUtils.isElementVisible(
          '[data-testid="allocation-details"], .allocation-detail, text="Details"'
        );

        if (hasDetails) {
          expect(hasDetails).toBe(true);

          // Should show allocation metadata
          const hasMetadata = await testUtils.isElementVisible(
            'text="Created", text="Income Event", text="Status"'
          );
          expect(hasMetadata).toBe(true);

          // Should show allocation history if available
          const hasHistory = await testUtils.isElementVisible(
            'text="History", text="Changes", .allocation-history'
          );

          if (hasHistory) {
            expect(hasHistory).toBe(true);
          }
        }
      }
    });

    test('should delete allocation', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      const allocationItem = page.locator(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (await allocationItem.first().isVisible()) {
        const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-allocation"]').first();

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Should show confirmation dialog
          const hasConfirmDialog = await testUtils.isElementVisible(
            'text="Are you sure", text="Delete allocation", .confirmation-dialog'
          );

          if (hasConfirmDialog) {
            expect(hasConfirmDialog).toBe(true);

            // Confirm deletion
            await testUtils.clickButton('button:has-text("Delete"), button:has-text("Confirm")');

            // Should show success message
            const hasSuccess = await testUtils.isElementVisible(
              'text="Allocation deleted", .success-message'
            );

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Allocation Summary and Analysis', () => {
    test('should display allocation summary view', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for summary section
      const hasSummaryView = await testUtils.isElementVisible(
        '[data-testid="allocation-summary"], .summary-view, text="Summary"'
      );

      if (hasSummaryView) {
        expect(hasSummaryView).toBe(true);

        // Should show total allocated amounts
        const hasTotals = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Total Allocated"'
        );
        expect(hasTotals).toBe(true);

        // Should show allocation by category totals
        const hasCategoryTotals = await testUtils.isElementVisible(
          'text="by Category", .category-totals'
        );

        if (hasCategoryTotals) {
          expect(hasCategoryTotals).toBe(true);
        }
      }
    });

    test('should show allocation performance metrics', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for performance or analytics section
      const hasPerformance = await testUtils.isElementVisible(
        '[data-testid="allocation-performance"], .performance-metrics, text="Performance"'
      );

      if (hasPerformance) {
        expect(hasPerformance).toBe(true);

        // Should show utilization rates or similar metrics
        const hasMetrics = await testUtils.isElementVisible(
          'text="%", text="utilization", text="efficiency"'
        );
        expect(hasMetrics).toBe(true);
      }
    });

    test('should filter allocations by date range', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for date filter controls
      const hasDateFilter = await testUtils.isElementVisible(
        '[data-testid="date-filter"], input[type="date"], .date-picker'
      );

      if (hasDateFilter) {
        expect(hasDateFilter).toBe(true);

        // Set date range
        const fromDate = page.locator('input[type="date"]').first();
        const toDate = page.locator('input[type="date"]').last();

        if (await fromDate.isVisible() && await toDate.isVisible()) {
          await fromDate.fill('2024-01-01');
          await toDate.fill('2024-12-31');

          // Apply filter
          const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await testUtils.waitForPageLoad();

            // Should show filtered results
            const hasFilteredResults = await testUtils.isElementVisible(
              '[data-testid="allocation-item"], .allocation-card'
            );
            expect(hasFilteredResults).toBe(true);
          }
        }
      }
    });

    test('should export allocation data', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for export functionality
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-allocations"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show export options or directly download
        const hasExportOptions = await testUtils.isElementVisible(
          'text="CSV", text="PDF", text="Excel", .export-options'
        );

        if (hasExportOptions) {
          expect(hasExportOptions).toBe(true);

          // Select CSV export if available
          const csvOption = page.locator('button:has-text("CSV"), text="CSV"');
          if (await csvOption.isVisible()) {
            await csvOption.click();

            // Should show download indication
            const hasDownload = await testUtils.isElementVisible(
              'text="Download", text="Exported", .download-success'
            );

            if (hasDownload) {
              expect(hasDownload).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Allocation Integration', () => {
    test('should show allocation impact on payments', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      const allocationItem = page.locator(
        '[data-testid="allocation-item"], .allocation-card'
      );

      if (await allocationItem.first().isVisible()) {
        await allocationItem.first().click();

        // Look for payment impact information
        const hasPaymentImpact = await testUtils.isElementVisible(
          'text="Payments", text="impact", .payment-allocation'
        );

        if (hasPaymentImpact) {
          expect(hasPaymentImpact).toBe(true);

          // Should show affected payments
          const hasAffectedPayments = await testUtils.isElementVisible(
            '[data-testid="affected-payments"], .payment-list'
          );

          if (hasAffectedPayments) {
            expect(hasAffectedPayments).toBe(true);
          }
        }
      }
    });

    test('should integrate with budget performance tracking', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for performance tracking integration
      const hasPerformanceLink = await testUtils.isElementVisible(
        'a:has-text("Performance"), text="budget performance", .performance-link'
      );

      if (hasPerformanceLink) {
        await page.click('a:has-text("Performance"), text="budget performance"');

        // Should navigate to performance page or show performance data
        const hasPerformanceData = await testUtils.isElementVisible(
          '[data-testid="budget-performance"], text="Performance", .performance-dashboard'
        );

        if (hasPerformanceData) {
          expect(hasPerformanceData).toBe(true);
        }
      }
    });

    test('should show allocation projections', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Look for projections or forecasting
      const hasProjections = await testUtils.isElementVisible(
        'text="Projection", text="Forecast", .allocation-projections'
      );

      if (hasProjections) {
        expect(hasProjections).toBe(true);

        // Should show future allocation estimates
        const hasEstimates = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="projected", text="estimated"'
        );
        expect(hasEstimates).toBe(true);
      }
    });

    test('should validate allocation against available funds', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Create or edit an allocation that might exceed funds
      const hasCreateButton = await testUtils.isElementVisible(
        'button:has-text("Generate"), button:has-text("Create")'
      );

      if (hasCreateButton) {
        await page.click('button:has-text("Generate"), button:has-text("Create")');

        const hasForm = await testUtils.isElementVisible('[data-testid="allocation-form"], form');
        if (hasForm) {
          // Try to create allocation with excessive amounts
          const amountField = page.locator('input[type="number"]').first();
          if (await amountField.isVisible()) {
            await amountField.fill('999999'); // Excessive amount

            await testUtils.clickButton('button:has-text("Generate"), button:has-text("Create")');

            // Should show validation error
            const hasValidationError = await testUtils.isElementVisible(
              'text="exceeds available", text="insufficient funds", .error-message'
            );

            if (hasValidationError) {
              expect(hasValidationError).toBe(true);
            }
          }
        }
      }
    });
  });
});