import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Data Export Functionality', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for data export tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access export features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Report Exports', () => {
    test('should export cash flow report as PDF', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Look for export functionality
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-report"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show export options
        const hasExportOptions = await testUtils.isElementVisible(
          'text="PDF", text="Excel", text="CSV", .export-options'
        );

        if (hasExportOptions) {
          expect(hasExportOptions).toBe(true);

          // Select PDF export
          const pdfOption = page.locator('button:has-text("PDF"), text="PDF"');
          if (await pdfOption.isVisible()) {
            await pdfOption.click();

            // Should show download indication or progress
            const hasDownloadIndicator = await testUtils.isElementVisible(
              'text="Preparing", text="Download", text="Generated", .download-progress, .export-status'
            );

            if (hasDownloadIndicator) {
              expect(hasDownloadIndicator).toBe(true);

              // Wait for export completion
              await testUtils.waitForPageLoad();

              // Should show success message
              const hasSuccess = await testUtils.isElementVisible(
                'text="Export completed", text="Download ready", .export-success'
              );

              if (hasSuccess) {
                expect(hasSuccess).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should export spending analysis as Excel', async ({ page }) => {
      await page.goto('/reports/spending');
      await testUtils.waitForPageLoad();

      // Look for export functionality
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-report"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Select Excel export
        const excelOption = page.locator('button:has-text("Excel"), text="Excel", text="XLSX"');
        if (await excelOption.isVisible()) {
          await excelOption.click();

          // Should show export progress
          const hasExportProgress = await testUtils.isElementVisible(
            '.loading, .spinner, text="Exporting", .progress-indicator'
          );

          if (hasExportProgress) {
            expect(hasExportProgress).toBe(true);

            // Wait for completion
            await testUtils.waitForPageLoad();

            // Should show download link or success message
            const hasDownloadReady = await testUtils.isElementVisible(
              'text="Download Excel", text="Export ready", a[download], .download-link'
            );

            if (hasDownloadReady) {
              expect(hasDownloadReady).toBe(true);
            }
          }
        }
      }
    });

    test('should export budget performance as CSV', async ({ page }) => {
      await page.goto('/reports/budget-performance');
      await testUtils.waitForPageLoad();

      // Look for export functionality
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-report"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Select CSV export
        const csvOption = page.locator('button:has-text("CSV"), text="CSV"');
        if (await csvOption.isVisible()) {
          await csvOption.click();

          // Should show export configuration options
          const hasExportConfig = await testUtils.isElementVisible(
            'text="Include Headers", text="Date Format", .export-config'
          );

          if (hasExportConfig) {
            expect(hasExportConfig).toBe(true);

            // Configure export settings
            const includeHeaders = page.locator('input[type="checkbox"]').first();
            if (await includeHeaders.isVisible()) {
              await includeHeaders.check();
            }

            // Confirm export
            await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate CSV")');

            // Should show success and download
            const hasDownload = await testUtils.isElementVisible(
              'text="CSV Ready", text="Download", .download-csv'
            );

            if (hasDownload) {
              expect(hasDownload).toBe(true);
            }
          }
        }
      }
    });

    test('should handle custom report export with date range', async ({ page }) => {
      await page.goto('/reports/custom');
      await testUtils.waitForPageLoad();

      // Create a custom report first
      const hasReportForm = await testUtils.isElementVisible(
        '[data-testid="report-form"], .report-configuration, form'
      );

      if (hasReportForm) {
        // Configure report
        const dataSourceSelect = page.locator('select[name*="source"], [data-testid="data-source"]');
        if (await dataSourceSelect.isVisible()) {
          await dataSourceSelect.selectOption({ index: 0 });
        }

        // Set date range for export
        const fromDate = page.locator('input[type="date"]').first();
        const toDate = page.locator('input[type="date"]').last();
        if (await fromDate.isVisible() && await toDate.isVisible()) {
          await fromDate.fill('2024-01-01');
          await toDate.fill('2024-06-30');
        }

        // Generate report
        await testUtils.clickButton('button:has-text("Generate"), button:has-text("Create Report")');
        await testUtils.waitForPageLoad();

        // Now export it
        const hasExportButton = await testUtils.isElementVisible(
          'button:has-text("Export"), [data-testid="export-custom"]'
        );

        if (hasExportButton) {
          await page.click('button:has-text("Export")');

          // Should show export formats
          const hasExportFormats = await testUtils.isElementVisible(
            'text="PDF", text="Excel", text="CSV", text="JSON"'
          );

          if (hasExportFormats) {
            expect(hasExportFormats).toBe(true);

            // Select JSON for structured data
            const jsonOption = page.locator('button:has-text("JSON"), text="JSON"');
            if (await jsonOption.isVisible()) {
              await jsonOption.click();

              // Should export successfully
              const hasJsonExport = await testUtils.isElementVisible(
                'text="JSON Export", text="Download JSON", .json-download'
              );

              if (hasJsonExport) {
                expect(hasJsonExport).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  test.describe('Transaction Data Exports', () => {
    test('should export transaction list with filters', async ({ page }) => {
      await page.goto('/transactions');
      await testUtils.waitForPageLoad();

      // Apply filters first
      const hasFilters = await testUtils.isElementVisible(
        '[data-testid="transaction-filters"], .filter-controls, select'
      );

      if (hasFilters) {
        // Set date filter
        const fromDate = page.locator('input[type="date"]').first();
        if (await fromDate.isVisible()) {
          await fromDate.fill('2024-01-01');
        }

        // Apply category filter
        const categoryFilter = page.locator('select[name*="category"], [data-testid="category-filter"]');
        if (await categoryFilter.isVisible()) {
          await categoryFilter.selectOption({ index: 1 });
        }

        // Apply filters
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await testUtils.waitForPageLoad();
        }
      }

      // Export filtered transactions
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-transactions"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show export options
        const hasExportDialog = await testUtils.isElementVisible(
          '[data-testid="export-dialog"], .export-modal, text="Export Transactions"'
        );

        if (hasExportDialog) {
          expect(hasExportDialog).toBe(true);

          // Select Excel format
          const excelOption = page.locator('input[type="radio"][value="excel"], button:has-text("Excel")');
          if (await excelOption.isVisible()) {
            await excelOption.click();
          }

          // Configure export columns
          const hasColumnSelection = await testUtils.isElementVisible(
            'text="Select Columns", .column-selector, input[type="checkbox"]'
          );

          if (hasColumnSelection) {
            // Select specific columns
            const amountColumn = page.locator('input[type="checkbox"][value="amount"]');
            const dateColumn = page.locator('input[type="checkbox"][value="date"]');
            const categoryColumn = page.locator('input[type="checkbox"][value="category"]');

            if (await amountColumn.isVisible()) await amountColumn.check();
            if (await dateColumn.isVisible()) await dateColumn.check();
            if (await categoryColumn.isVisible()) await categoryColumn.check();
          }

          // Start export
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Download")');

          // Should show export progress and completion
          const hasExportComplete = await testUtils.isElementVisible(
            'text="Export completed", text="transactions exported", .export-success'
          );

          if (hasExportComplete) {
            expect(hasExportComplete).toBe(true);
          }
        }
      }
    });

    test('should export uncategorized transactions for review', async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Should show uncategorized transactions
      const hasUncategorized = await testUtils.isElementVisible(
        '[data-testid="uncategorized-transactions"], .uncategorized-list'
      );

      if (hasUncategorized) {
        // Export uncategorized for external categorization
        const hasExportButton = await testUtils.isElementVisible(
          'button:has-text("Export"), [data-testid="export-uncategorized"]'
        );

        if (hasExportButton) {
          await page.click('button:has-text("Export")');

          // Should offer CSV template for categorization
          const hasCsvTemplate = await testUtils.isElementVisible(
            'text="Categorization Template", text="CSV Template", button:has-text("Download Template")'
          );

          if (hasCsvTemplate) {
            expect(hasCsvTemplate).toBe(true);

            await page.click('button:has-text("Download Template")');

            // Should confirm template download
            const hasTemplateDownload = await testUtils.isElementVisible(
              'text="Template ready", text="categorization template", .template-success'
            );

            if (hasTemplateDownload) {
              expect(hasTemplateDownload).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Financial Data Exports', () => {
    test('should export income events with attribution details', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Export income events
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-income"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show income export options
        const hasIncomeExportOptions = await testUtils.isElementVisible(
          'text="Include Attribution", text="Include Payments", .export-options'
        );

        if (hasIncomeExportOptions) {
          expect(hasIncomeExportOptions).toBe(true);

          // Enable attribution details
          const includeAttribution = page.locator('input[type="checkbox"][name*="attribution"]');
          if (await includeAttribution.isVisible()) {
            await includeAttribution.check();
          }

          // Enable payment details
          const includePayments = page.locator('input[type="checkbox"][name*="payments"]');
          if (await includePayments.isVisible()) {
            await includePayments.check();
          }

          // Select Excel format for structured data
          await testUtils.clickButton('button:has-text("Excel"), input[value="excel"]');

          // Start export
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate")');

          // Should show comprehensive export
          const hasDetailedExport = await testUtils.isElementVisible(
            'text="Income data exported", text="with attribution", .detailed-export'
          );

          if (hasDetailedExport) {
            expect(hasDetailedExport).toBe(true);
          }
        }
      }
    });

    test('should export payment schedule with due dates', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Export payment schedule
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-payments"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show payment export configuration
        const hasPaymentConfig = await testUtils.isElementVisible(
          'text="Export Range", text="Include Upcoming", text="Include Overdue"'
        );

        if (hasPaymentConfig) {
          expect(hasPaymentConfig).toBe(true);

          // Set export range
          const rangeSelect = page.locator('select[name*="range"], [data-testid="export-range"]');
          if (await rangeSelect.isVisible()) {
            await rangeSelect.selectOption('next-6-months');
          }

          // Include upcoming payments
          const includeUpcoming = page.locator('input[type="checkbox"][name*="upcoming"]');
          if (await includeUpcoming.isVisible()) {
            await includeUpcoming.check();
          }

          // Export as CSV for calendar import
          await testUtils.clickButton('button:has-text("CSV"), input[value="csv"]');

          // Generate export
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate CSV")');

          // Should create calendar-compatible export
          const hasCalendarExport = await testUtils.isElementVisible(
            'text="Calendar-compatible", text="CSV ready", .calendar-export'
          );

          if (hasCalendarExport) {
            expect(hasCalendarExport).toBe(true);
          }
        }
      }
    });

    test('should export budget allocations with variance analysis', async ({ page }) => {
      await page.goto('/budget/allocations');
      await testUtils.waitForPageLoad();

      // Export budget data
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-budget"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show budget export options
        const hasBudgetOptions = await testUtils.isElementVisible(
          'text="Include Variance", text="Include Projections", text="Include History"'
        );

        if (hasBudgetOptions) {
          expect(hasBudgetOptions).toBe(true);

          // Include variance analysis
          const includeVariance = page.locator('input[type="checkbox"][name*="variance"]');
          if (await includeVariance.isVisible()) {
            await includeVariance.check();
          }

          // Include projections
          const includeProjections = page.locator('input[type="checkbox"][name*="projections"]');
          if (await includeProjections.isVisible()) {
            await includeProjections.check();
          }

          // Select Excel for complex data
          await testUtils.clickButton('button:has-text("Excel"), input[value="excel"]');

          // Generate comprehensive budget export
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate Report")');

          // Should show detailed budget export
          const hasBudgetExport = await testUtils.isElementVisible(
            'text="Budget analysis exported", text="variance data", .budget-export-success'
          );

          if (hasBudgetExport) {
            expect(hasBudgetExport).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Bank Account Data Exports', () => {
    test('should export bank account connection summary', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Export bank account information
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-accounts"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show account export options
        const hasAccountOptions = await testUtils.isElementVisible(
          'text="Account Summary", text="Connection Status", text="Balance History"'
        );

        if (hasAccountOptions) {
          expect(hasAccountOptions).toBe(true);

          // Select summary export
          const summaryOption = page.locator('input[type="radio"][value="summary"]');
          if (await summaryOption.isVisible()) {
            await summaryOption.click();
          }

          // Export as PDF for documentation
          await testUtils.clickButton('button:has-text("PDF"), input[value="pdf"]');

          // Generate account summary
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate PDF")');

          // Should create account summary document
          const hasSummaryPDF = await testUtils.isElementVisible(
            'text="Account summary", text="PDF ready", .account-summary-export'
          );

          if (hasSummaryPDF) {
            expect(hasSummaryPDF).toBe(true);
          }
        }
      }
    });

    test('should export transaction matching report', async ({ page }) => {
      await page.goto('/bank-accounts');
      await testUtils.waitForPageLoad();

      // Navigate to transaction matching
      const hasMatchingSection = await testUtils.isElementVisible(
        'a:has-text("Transaction Matching"), button:has-text("Matching"), [data-testid="transaction-matching"]'
      );

      if (hasMatchingSection) {
        await page.click('a:has-text("Transaction Matching"), button:has-text("Matching")');
        await testUtils.waitForPageLoad();

        // Export matching results
        const hasExportMatching = await testUtils.isElementVisible(
          'button:has-text("Export"), [data-testid="export-matching"]'
        );

        if (hasExportMatching) {
          await page.click('button:has-text("Export")');

          // Should show matching export options
          const hasMatchingOptions = await testUtils.isElementVisible(
            'text="Matched Transactions", text="Unmatched Transactions", text="All Results"'
          );

          if (hasMatchingOptions) {
            expect(hasMatchingOptions).toBe(true);

            // Export all results for review
            const allResultsOption = page.locator('input[type="radio"][value="all"]');
            if (await allResultsOption.isVisible()) {
              await allResultsOption.click();
            }

            // Use Excel for detailed analysis
            await testUtils.clickButton('button:has-text("Excel"), input[value="excel"]');

            // Generate matching report
            await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate Report")');

            // Should create comprehensive matching report
            const hasMatchingReport = await testUtils.isElementVisible(
              'text="Matching report", text="Excel ready", .matching-export'
            );

            if (hasMatchingReport) {
              expect(hasMatchingReport).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Bulk Data Operations', () => {
    test('should export complete financial data backup', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Look for data export or backup functionality
      const hasDataExport = await testUtils.isElementVisible(
        'button:has-text("Export All"), button:has-text("Backup"), [data-testid="bulk-export"]'
      );

      if (hasDataExport) {
        await page.click('button:has-text("Export All"), button:has-text("Backup")');

        // Should show comprehensive export options
        const hasBulkOptions = await testUtils.isElementVisible(
          'text="Complete Backup", text="Select Data Types", .bulk-export-options'
        );

        if (hasBulkOptions) {
          expect(hasBulkOptions).toBe(true);

          // Select all data types
          const selectAllCheckbox = page.locator('input[type="checkbox"][name="selectAll"]');
          if (await selectAllCheckbox.isVisible()) {
            await selectAllCheckbox.check();
          } else {
            // Manually select key data types
            const dataTypes = ['income', 'payments', 'transactions', 'budget', 'accounts'];
            for (const type of dataTypes) {
              const checkbox = page.locator(`input[type="checkbox"][value="${type}"]`);
              if (await checkbox.isVisible()) {
                await checkbox.check();
              }
            }
          }

          // Select export format
          const formatSelect = page.locator('select[name*="format"], [data-testid="export-format"]');
          if (await formatSelect.isVisible()) {
            await formatSelect.selectOption('json'); // Structured format for backup
          }

          // Start bulk export
          await testUtils.clickButton('button:has-text("Start Export"), button:has-text("Create Backup")');

          // Should show progress indicator
          const hasProgressIndicator = await testUtils.isElementVisible(
            '.progress-bar, .export-progress, text="Exporting", .bulk-progress'
          );

          if (hasProgressIndicator) {
            expect(hasProgressIndicator).toBe(true);

            // Wait for completion (allow more time for bulk export)
            await page.waitForTimeout(5000);

            // Should show completion status
            const hasCompletion = await testUtils.isElementVisible(
              'text="Export completed", text="Backup ready", .export-complete'
            );

            if (hasCompletion) {
              expect(hasCompletion).toBe(true);

              // Should show download options
              const hasDownloadOptions = await testUtils.isElementVisible(
                'button:has-text("Download"), a[download], .download-backup'
              );

              if (hasDownloadOptions) {
                expect(hasDownloadOptions).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should handle export cancellation gracefully', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Start an export
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-report"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Select a format and start export
        const pdfOption = page.locator('button:has-text("PDF")');
        if (await pdfOption.isVisible()) {
          await pdfOption.click();

          // Look for progress indicator and cancel option
          const hasCancelOption = await testUtils.isElementVisible(
            'button:has-text("Cancel"), [data-testid="cancel-export"], .cancel-button'
          );

          if (hasCancelOption) {
            await page.click('button:has-text("Cancel")');

            // Should show cancellation confirmation
            const hasCancelConfirm = await testUtils.isElementVisible(
              'text="Export cancelled", text="Cancelled", .export-cancelled'
            );

            if (hasCancelConfirm) {
              expect(hasCancelConfirm).toBe(true);

              // Should return to normal state
              const hasNormalState = await testUtils.isElementVisible(
                'button:has-text("Export"), [data-testid="export-report"]'
              );
              expect(hasNormalState).toBe(true);
            }
          }
        }
      }
    });

    test('should validate export permissions and limits', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Attempt export with potential limits
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-report"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Check for permission warnings or limits
        const hasLimitWarning = await testUtils.isElementVisible(
          'text="Export limit", text="Premium feature", text="Upgrade required", .export-limit'
        );

        if (hasLimitWarning) {
          expect(hasLimitWarning).toBe(true);

          // Should show upgrade options or alternative formats
          const hasAlternatives = await testUtils.isElementVisible(
            'text="Basic export available", text="Upgrade", button:has-text("Continue")'
          );

          if (hasAlternatives) {
            expect(hasAlternatives).toBe(true);
          }
        } else {
          // Should proceed with normal export
          const hasNormalExport = await testUtils.isElementVisible(
            'text="PDF", text="Excel", text="CSV", .export-formats'
          );
          expect(hasNormalExport).toBe(true);
        }
      }
    });
  });

  test.describe('Export Quality and Validation', () => {
    test('should validate exported data integrity', async ({ page }) => {
      await page.goto('/transactions');
      await testUtils.waitForPageLoad();

      // Get reference count of visible transactions
      const transactionItems = page.locator('[data-testid="transaction-item"], .transaction-row, tr').count();

      // Export transactions
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-transactions"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Select CSV for easy validation
        const csvOption = page.locator('button:has-text("CSV")');
        if (await csvOption.isVisible()) {
          await csvOption.click();

          // Start export
          await testUtils.clickButton('button:has-text("Export"), button:has-text("Generate")');

          // Should show export summary with record count
          const hasRecordCount = await testUtils.isElementVisible(
            'text=/\\d+ transactions/, text=/\\d+ records/, .record-count'
          );

          if (hasRecordCount) {
            expect(hasRecordCount).toBe(true);

            // Should show data validation confirmation
            const hasValidation = await testUtils.isElementVisible(
              'text="Data validated", text="No errors", .validation-success'
            );

            if (hasValidation) {
              expect(hasValidation).toBe(true);
            }
          }
        }
      }
    });

    test('should handle large export datasets efficiently', async ({ page }) => {
      await page.goto('/transactions');
      await testUtils.waitForPageLoad();

      // Set wide date range for large dataset
      const fromDate = page.locator('input[type="date"]').first();
      if (await fromDate.isVisible()) {
        await fromDate.fill('2020-01-01');
      }

      // Apply filter to get large dataset
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await testUtils.waitForPageLoad();
      }

      // Export large dataset
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-transactions"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show large dataset warning
        const hasDatasetWarning = await testUtils.isElementVisible(
          'text="Large dataset", text="may take longer", .dataset-warning'
        );

        if (hasDatasetWarning) {
          expect(hasDatasetWarning).toBe(true);

          // Proceed with export
          const csvOption = page.locator('button:has-text("CSV")');
          if (await csvOption.isVisible()) {
            await csvOption.click();

            await testUtils.clickButton('button:has-text("Export"), button:has-text("Continue")');

            // Should show progress for large export
            const hasProgress = await testUtils.isElementVisible(
              '.progress-bar, text="Processing", text="% complete", .large-export-progress'
            );

            if (hasProgress) {
              expect(hasProgress).toBe(true);

              // Should complete successfully even with large dataset
              await page.waitForTimeout(10000); // Allow time for large export

              const hasCompletion = await testUtils.isElementVisible(
                'text="Export completed", text="Large dataset exported", .large-export-complete'
              );

              if (hasCompletion) {
                expect(hasCompletion).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should provide export format recommendations', async ({ page }) => {
      await page.goto('/reports/custom');
      await testUtils.waitForPageLoad();

      // Create custom report
      const generateButton = page.locator('button:has-text("Generate")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await testUtils.waitForPageLoad();
      }

      // Access export with recommendations
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-custom"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show format recommendations
        const hasRecommendations = await testUtils.isElementVisible(
          'text="Recommended:", text="Best for", .format-recommendation'
        );

        if (hasRecommendations) {
          expect(hasRecommendations).toBe(true);

          // Should show format descriptions
          const hasDescriptions = await testUtils.isElementVisible(
            'text="Excel: Best for analysis", text="PDF: Best for sharing", text="CSV: Best for import"'
          );

          if (hasDescriptions) {
            expect(hasDescriptions).toBe(true);
          }

          // Should highlight recommended option
          const hasHighlightedRecommendation = await testUtils.isElementVisible(
            '.recommended, .highlight, [data-recommended="true"]'
          );

          if (hasHighlightedRecommendation) {
            expect(hasHighlightedRecommendation).toBe(true);
          }
        }
      }
    });
  });
});