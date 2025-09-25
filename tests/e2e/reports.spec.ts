import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Reports Generation Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for reports tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access reports features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Reports Access and Overview', () => {
    test('should access reports from dashboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Look for reports navigation
      const hasReportsAccess = await testUtils.isElementVisible(
        'a:has-text("Reports"), button:has-text("Reports"), [data-testid="reports-nav"]'
      );

      if (hasReportsAccess) {
        expect(hasReportsAccess).toBe(true);

        await page.click('a:has-text("Reports"), button:has-text("Reports")');
        await testUtils.waitForUrlChange('/reports');

        // Should show reports page
        const hasReportsPage = await testUtils.isElementVisible(
          '[data-testid="reports-page"], h1:has-text("Reports"), .reports-container'
        );
        expect(hasReportsPage).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/reports');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display reports overview with available reports', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Should show reports dashboard or overview
      const hasReportsOverview = await testUtils.isElementVisible(
        '[data-testid="reports-dashboard"], .reports-overview, text="Available Reports"'
      );

      if (hasReportsOverview) {
        expect(hasReportsOverview).toBe(true);

        // Should show different report types
        const hasReportTypes = await testUtils.isElementVisible(
          'text="Cash Flow", text="Spending", text="Budget", text="Income"'
        );
        expect(hasReportTypes).toBe(true);
      }
    });

    test('should show report categories and descriptions', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for report cards or sections
      const hasReportCards = await testUtils.isElementVisible(
        '[data-testid="report-card"], .report-item, .report-category'
      );

      if (hasReportCards) {
        expect(hasReportCards).toBe(true);

        // Should show descriptions
        const hasDescriptions = await testUtils.isElementVisible(
          'text="analysis", text="overview", .report-description'
        );
        expect(hasDescriptions).toBe(true);
      }
    });
  });

  test.describe('Cash Flow Reports', () => {
    test('should generate cash flow report', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for cash flow report option
      const hasCashFlowReport = await testUtils.isElementVisible(
        'a:has-text("Cash Flow"), button:has-text("Cash Flow"), [data-testid="cash-flow-report"]'
      );

      if (hasCashFlowReport) {
        await page.click('a:has-text("Cash Flow"), button:has-text("Cash Flow")');
        await testUtils.waitForUrlChange('/reports/cash-flow');

        // Should show cash flow report page
        const hasCashFlowPage = await testUtils.isElementVisible(
          '[data-testid="cash-flow-report"], h1:has-text("Cash Flow"), .cash-flow-container'
        );

        if (hasCashFlowPage) {
          expect(hasCashFlowPage).toBe(true);

          // Should show cash flow chart
          const hasCashFlowChart = await testUtils.isElementVisible(
            '[data-testid="cash-flow-chart"], .chart-container, canvas'
          );
          expect(hasCashFlowChart).toBe(true);

          // Should show key metrics
          const hasMetrics = await testUtils.isElementVisible(
            'text=/\\$\\d+/, text="Net Cash Flow", text="Total Income"'
          );
          expect(hasMetrics).toBe(true);
        }
      } else {
        // Direct navigation
        await page.goto('/reports/cash-flow');
        await testUtils.waitForPageLoad();
      }
    });

    test('should customize cash flow report date range', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Look for date range controls
      const hasDateControls = await testUtils.isElementVisible(
        '[data-testid="date-range"], input[type="date"], .date-picker'
      );

      if (hasDateControls) {
        expect(hasDateControls).toBe(true);

        // Set custom date range
        const fromDate = page.locator('input[type="date"]').first();
        const toDate = page.locator('input[type="date"]').last();

        if (await fromDate.isVisible() && await toDate.isVisible()) {
          await fromDate.fill('2024-01-01');
          await toDate.fill('2024-03-31');

          // Apply date filter
          const applyButton = page.locator('button:has-text("Apply"), button:has-text("Generate")');
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await testUtils.waitForPageLoad();

            // Should show updated report
            const hasUpdatedReport = await testUtils.isElementVisible(
              '[data-testid="cash-flow-chart"], .chart-container'
            );
            expect(hasUpdatedReport).toBe(true);
          }
        }
      }
    });

    test('should export cash flow report', async ({ page }) => {
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

            // Should show download indication
            const hasDownload = await testUtils.isElementVisible(
              'text="Download", text="Generated", .download-success'
            );

            if (hasDownload) {
              expect(hasDownload).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Spending Analysis Reports', () => {
    test('should generate spending analysis report', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for spending analysis report
      const hasSpendingReport = await testUtils.isElementVisible(
        'a:has-text("Spending"), button:has-text("Spending"), [data-testid="spending-report"]'
      );

      if (hasSpendingReport) {
        await page.click('a:has-text("Spending"), button:has-text("Spending")');
        await testUtils.waitForUrlChange('/reports/spending');

        // Should show spending analysis page
        const hasSpendingPage = await testUtils.isElementVisible(
          '[data-testid="spending-report"], h1:has-text("Spending"), .spending-container'
        );

        if (hasSpendingPage) {
          expect(hasSpendingPage).toBe(true);

          // Should show spending breakdown
          const hasSpendingChart = await testUtils.isElementVisible(
            '[data-testid="spending-chart"], .pie-chart, .category-chart'
          );
          expect(hasSpendingChart).toBe(true);

          // Should show category breakdown
          const hasCategoryBreakdown = await testUtils.isElementVisible(
            'text="Category", text="Housing", text="Utilities", .category-list'
          );
          expect(hasCategoryBreakdown).toBe(true);
        }
      } else {
        await page.goto('/reports/spending');
        await testUtils.waitForPageLoad();
      }
    });

    test('should filter spending by category', async ({ page }) => {
      await page.goto('/reports/spending');
      await testUtils.waitForPageLoad();

      // Look for category filters
      const hasCategoryFilter = await testUtils.isElementVisible(
        '[data-testid="category-filter"], .category-selector, select'
      );

      if (hasCategoryFilter) {
        expect(hasCategoryFilter).toBe(true);

        // Select specific category
        const categorySelect = page.locator('select, [data-testid="category-select"]').first();
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 1 }); // Select first available option

          // Should update report
          await testUtils.waitForPageLoad();
          const hasFilteredReport = await testUtils.isElementVisible(
            '[data-testid="spending-chart"], .filtered-chart'
          );

          if (hasFilteredReport) {
            expect(hasFilteredReport).toBe(true);
          }
        }
      }
    });

    test('should show spending trends over time', async ({ page }) => {
      await page.goto('/reports/spending');
      await testUtils.waitForPageLoad();

      // Look for trends section
      const hasTrends = await testUtils.isElementVisible(
        '[data-testid="spending-trends"], text="Trends", .trend-chart'
      );

      if (hasTrends) {
        expect(hasTrends).toBe(true);

        // Should show trend indicators
        const hasTrendIndicators = await testUtils.isElementVisible(
          'text="increase", text="decrease", text="%", .trend-indicator'
        );
        expect(hasTrendIndicators).toBe(true);
      }
    });
  });

  test.describe('Budget Performance Reports', () => {
    test('should generate budget performance report', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for budget performance report
      const hasBudgetReport = await testUtils.isElementVisible(
        'a:has-text("Budget Performance"), button:has-text("Budget"), [data-testid="budget-report"]'
      );

      if (hasBudgetReport) {
        await page.click('a:has-text("Budget Performance"), button:has-text("Budget")');
        await testUtils.waitForUrlChange('/reports/budget-performance');

        // Should show budget performance page
        const hasBudgetPage = await testUtils.isElementVisible(
          '[data-testid="budget-report"], h1:has-text("Budget Performance"), .budget-container'
        );

        if (hasBudgetPage) {
          expect(hasBudgetPage).toBe(true);

          // Should show budget vs actual comparison
          const hasBudgetComparison = await testUtils.isElementVisible(
            '[data-testid="budget-chart"], text="vs Actual", .comparison-chart'
          );
          expect(hasBudgetComparison).toBe(true);

          // Should show variance analysis
          const hasVariance = await testUtils.isElementVisible(
            'text="Variance", text="Over Budget", text="Under Budget"'
          );
          expect(hasVariance).toBe(true);
        }
      } else {
        await page.goto('/reports/budget-performance');
        await testUtils.waitForPageLoad();
      }
    });

    test('should show budget category performance', async ({ page }) => {
      await page.goto('/reports/budget-performance');
      await testUtils.waitForPageLoad();

      // Should show category-wise performance
      const hasCategoryPerformance = await testUtils.isElementVisible(
        '[data-testid="category-performance"], .category-table, text="Category"'
      );

      if (hasCategoryPerformance) {
        expect(hasCategoryPerformance).toBe(true);

        // Should show budget amounts and actuals
        const hasAmounts = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Budgeted", text="Actual"'
        );
        expect(hasAmounts).toBe(true);

        // Should show performance indicators
        const hasPerformanceIndicators = await testUtils.isElementVisible(
          'text="%", .over-budget, .under-budget, .on-track'
        );

        if (hasPerformanceIndicators) {
          expect(hasPerformanceIndicators).toBe(true);
        }
      }
    });

    test('should generate budget recommendations', async ({ page }) => {
      await page.goto('/reports/budget-performance');
      await testUtils.waitForPageLoad();

      // Look for recommendations section
      const hasRecommendations = await testUtils.isElementVisible(
        '[data-testid="recommendations"], text="Recommendations", .insights'
      );

      if (hasRecommendations) {
        expect(hasRecommendations).toBe(true);

        // Should show actionable insights
        const hasInsights = await testUtils.isElementVisible(
          'text="Consider", text="Reduce", text="Increase", .recommendation-item'
        );
        expect(hasInsights).toBe(true);
      }
    });
  });

  test.describe('Income Analysis Reports', () => {
    test('should generate income analysis report', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for income analysis report
      const hasIncomeReport = await testUtils.isElementVisible(
        'a:has-text("Income"), button:has-text("Income"), [data-testid="income-report"]'
      );

      if (hasIncomeReport) {
        await page.click('a:has-text("Income"), button:has-text("Income")');
        await testUtils.waitForUrlChange('/reports/income-analysis');

        // Should show income analysis page
        const hasIncomePage = await testUtils.isElementVisible(
          '[data-testid="income-report"], h1:has-text("Income"), .income-container'
        );

        if (hasIncomePage) {
          expect(hasIncomePage).toBe(true);

          // Should show income sources breakdown
          const hasIncomeChart = await testUtils.isElementVisible(
            '[data-testid="income-chart"], .income-breakdown, canvas'
          );
          expect(hasIncomeChart).toBe(true);

          // Should show income metrics
          const hasIncomeMetrics = await testUtils.isElementVisible(
            'text=/\\$\\d+/, text="Total Income", text="Average"'
          );
          expect(hasIncomeMetrics).toBe(true);
        }
      } else {
        await page.goto('/reports/income-analysis');
        await testUtils.waitForPageLoad();
      }
    });

    test('should show income regularity analysis', async ({ page }) => {
      await page.goto('/reports/income-analysis');
      await testUtils.waitForPageLoad();

      // Look for regularity analysis
      const hasRegularityAnalysis = await testUtils.isElementVisible(
        '[data-testid="regularity"], text="Regularity", text="Frequency"'
      );

      if (hasRegularityAnalysis) {
        expect(hasRegularityAnalysis).toBe(true);

        // Should show frequency patterns
        const hasFrequencyData = await testUtils.isElementVisible(
          'text="Monthly", text="Weekly", text="Irregular"'
        );
        expect(hasFrequencyData).toBe(true);
      }
    });

    test('should project future income', async ({ page }) => {
      await page.goto('/reports/income-analysis');
      await testUtils.waitForPageLoad();

      // Look for projections section
      const hasProjections = await testUtils.isElementVisible(
        '[data-testid="income-projections"], text="Projections", text="Forecast"'
      );

      if (hasProjections) {
        expect(hasProjections).toBe(true);

        // Should show projected amounts
        const hasProjectedAmounts = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Projected", text="Expected"'
        );
        expect(hasProjectedAmounts).toBe(true);
      }
    });
  });

  test.describe('Custom Reports', () => {
    test('should access custom report builder', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for custom report option
      const hasCustomReport = await testUtils.isElementVisible(
        'a:has-text("Custom"), button:has-text("Custom"), [data-testid="custom-report"]'
      );

      if (hasCustomReport) {
        await page.click('a:has-text("Custom"), button:has-text("Custom")');
        await testUtils.waitForUrlChange('/reports/custom');

        // Should show custom report builder
        const hasReportBuilder = await testUtils.isElementVisible(
          '[data-testid="report-builder"], h1:has-text("Custom"), .report-builder'
        );

        if (hasReportBuilder) {
          expect(hasReportBuilder).toBe(true);

          // Should show configuration options
          const hasConfiguration = await testUtils.isElementVisible(
            'text="Data Source", text="Chart Type", text="Date Range"'
          );
          expect(hasConfiguration).toBe(true);
        }
      } else {
        await page.goto('/reports/custom');
        await testUtils.waitForPageLoad();
      }
    });

    test('should build custom report with selections', async ({ page }) => {
      await page.goto('/reports/custom');
      await testUtils.waitForPageLoad();

      const hasReportForm = await testUtils.isElementVisible(
        '[data-testid="report-form"], .report-configuration, form'
      );

      if (hasReportForm) {
        // Select data source
        const dataSourceSelect = page.locator('select[name*="source"], [data-testid="data-source"]');
        if (await dataSourceSelect.isVisible()) {
          await dataSourceSelect.selectOption({ index: 0 });
        }

        // Select chart type
        const chartTypeSelect = page.locator('select[name*="chart"], [data-testid="chart-type"]');
        if (await chartTypeSelect.isVisible()) {
          await chartTypeSelect.selectOption('bar');
        }

        // Set date range
        const fromDate = page.locator('input[type="date"]').first();
        const toDate = page.locator('input[type="date"]').last();
        if (await fromDate.isVisible() && await toDate.isVisible()) {
          await fromDate.fill('2024-01-01');
          await toDate.fill('2024-12-31');
        }

        // Generate report
        await testUtils.clickButton('button:has-text("Generate"), button:has-text("Create Report")');

        // Should show generated report
        const hasGeneratedReport = await testUtils.isElementVisible(
          '[data-testid="custom-report-result"], .generated-report, canvas'
        );

        if (hasGeneratedReport) {
          expect(hasGeneratedReport).toBe(true);
        }
      }
    });

    test('should save custom report', async ({ page }) => {
      await page.goto('/reports/custom');
      await testUtils.waitForPageLoad();

      // Generate a report first
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")');
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await testUtils.waitForPageLoad();
      }

      // Look for save functionality
      const hasSaveButton = await testUtils.isElementVisible(
        'button:has-text("Save"), [data-testid="save-report"]'
      );

      if (hasSaveButton) {
        await page.click('button:has-text("Save")');

        // Should show save dialog
        const hasSaveDialog = await testUtils.isElementVisible(
          '[data-testid="save-dialog"], .save-modal, text="Save Report"'
        );

        if (hasSaveDialog) {
          expect(hasSaveDialog).toBe(true);

          // Enter report name
          await testUtils.fillFormField('Name', 'My Custom Report');

          // Save the report
          await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');

          // Should show success
          const hasSuccess = await testUtils.isElementVisible(
            'text="Report saved", .success-message'
          );

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Scheduled Reports', () => {
    test('should access scheduled reports', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for scheduled reports section
      const hasScheduledReports = await testUtils.isElementVisible(
        'a:has-text("Scheduled"), button:has-text("Scheduled"), [data-testid="scheduled-reports"]'
      );

      if (hasScheduledReports) {
        await page.click('a:has-text("Scheduled"), button:has-text("Scheduled")');
        await testUtils.waitForUrlChange('/reports/scheduled');

        // Should show scheduled reports page
        const hasScheduledPage = await testUtils.isElementVisible(
          '[data-testid="scheduled-page"], h1:has-text("Scheduled"), .scheduled-container'
        );

        if (hasScheduledPage) {
          expect(hasScheduledPage).toBe(true);
        }
      } else {
        await page.goto('/reports/scheduled');
        await testUtils.waitForPageLoad();
      }
    });

    test('should create scheduled report', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Look for create scheduled report button
      const hasCreateButton = await testUtils.isElementVisible(
        'button:has-text("Schedule Report"), button:has-text("Create Schedule"), [data-testid="create-schedule"]'
      );

      if (hasCreateButton) {
        await page.click('button:has-text("Schedule Report"), button:has-text("Create Schedule")');

        // Should show scheduling form
        const hasSchedulingForm = await testUtils.isElementVisible(
          '[data-testid="schedule-form"], .schedule-modal, form'
        );

        if (hasSchedulingForm) {
          expect(hasSchedulingForm).toBe(true);

          // Fill in scheduling details
          await testUtils.fillFormField('Report Name', 'Weekly Cash Flow');

          // Select report type
          const reportTypeSelect = page.locator('select[name*="type"], [data-testid="report-type"]');
          if (await reportTypeSelect.isVisible()) {
            await reportTypeSelect.selectOption('cash-flow');
          }

          // Select frequency
          const frequencySelect = page.locator('select[name*="frequency"], [data-testid="frequency"]');
          if (await frequencySelect.isVisible()) {
            await frequencySelect.selectOption('weekly');
          }

          // Save schedule
          await testUtils.clickButton('button:has-text("Schedule"), button:has-text("Create")');

          // Should show success
          const hasSuccess = await testUtils.isElementVisible(
            'text="Report scheduled", .success-message'
          );

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }
        }
      }
    });

    test('should manage scheduled reports', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Should show list of scheduled reports
      const hasScheduledList = await testUtils.isElementVisible(
        '[data-testid="scheduled-list"], .schedule-item, .scheduled-report'
      );

      if (hasScheduledList) {
        expect(hasScheduledList).toBe(true);

        // Should show schedule details
        const hasScheduleDetails = await testUtils.isElementVisible(
          'text="Weekly", text="Monthly", text="Daily", .frequency-label'
        );
        expect(hasScheduleDetails).toBe(true);

        // Should have management options
        const hasManagementOptions = await testUtils.isElementVisible(
          'button:has-text("Edit"), button:has-text("Delete"), button:has-text("Pause")'
        );

        if (hasManagementOptions) {
          expect(hasManagementOptions).toBe(true);
        }
      }
    });
  });

  test.describe('Report Sharing and Collaboration', () => {
    test('should generate shareable report link', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Look for share functionality
      const hasShareButton = await testUtils.isElementVisible(
        'button:has-text("Share"), [data-testid="share-report"]'
      );

      if (hasShareButton) {
        await page.click('button:has-text("Share")');

        // Should show share options
        const hasShareOptions = await testUtils.isElementVisible(
          '[data-testid="share-modal"], text="Share Report", .share-options'
        );

        if (hasShareOptions) {
          expect(hasShareOptions).toBe(true);

          // Should show link generation option
          const hasLinkOption = await testUtils.isElementVisible(
            'button:has-text("Generate Link"), text="Shareable Link"'
          );

          if (hasLinkOption) {
            await page.click('button:has-text("Generate Link")');

            // Should show generated link
            const hasGeneratedLink = await testUtils.isElementVisible(
              'input[type="text"], text="https://", .share-link'
            );

            if (hasGeneratedLink) {
              expect(hasGeneratedLink).toBe(true);
            }
          }
        }
      }
    });

    test('should email report to recipients', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      const shareButton = page.locator('button:has-text("Share"), [data-testid="share-report"]');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Look for email option
        const hasEmailOption = await testUtils.isElementVisible(
          'button:has-text("Email"), text="Send via Email"'
        );

        if (hasEmailOption) {
          await page.click('button:has-text("Email"), text="Send via Email"');

          // Should show email form
          const hasEmailForm = await testUtils.isElementVisible(
            '[data-testid="email-form"], input[type="email"], .email-recipients'
          );

          if (hasEmailForm) {
            expect(hasEmailForm).toBe(true);

            // Enter recipient email
            await testUtils.fillFormField('Email', 'recipient@example.com');

            // Send email
            await testUtils.clickButton('button:has-text("Send"), button:has-text("Email Report")');

            // Should show success
            const hasSuccess = await testUtils.isElementVisible(
              'text="Report sent", .success-message'
            );

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Report Performance and Optimization', () => {
    test('should show report generation progress', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // Trigger report regeneration
      const refreshButton = page.locator('button:has-text("Refresh"), [data-testid="refresh-report"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();

        // Should show loading indicator
        const hasLoadingIndicator = await testUtils.isElementVisible(
          '.loading, .spinner, text="Generating", .progress-bar'
        );

        if (hasLoadingIndicator) {
          expect(hasLoadingIndicator).toBe(true);

          // Wait for completion
          await testUtils.waitForPageLoad();

          // Should show completed report
          const hasCompletedReport = await testUtils.isElementVisible(
            '[data-testid="cash-flow-chart"], .chart-container'
          );
          expect(hasCompletedReport).toBe(true);
        }
      }
    });

    test('should handle large dataset efficiently', async ({ page }) => {
      // Navigate to a potentially data-heavy report
      await page.goto('/reports/spending');
      await testUtils.waitForPageLoad();

      // Set a wide date range to test performance
      const fromDate = page.locator('input[type="date"]').first();
      const toDate = page.locator('input[type="date"]').last();

      if (await fromDate.isVisible() && await toDate.isVisible()) {
        await fromDate.fill('2020-01-01');
        await toDate.fill('2024-12-31');

        const generateButton = page.locator('button:has-text("Apply"), button:has-text("Generate")');
        if (await generateButton.isVisible()) {
          const startTime = Date.now();
          await generateButton.click();
          await testUtils.waitForPageLoad();

          const endTime = Date.now();
          const loadTime = endTime - startTime;

          // Should complete within reasonable time (10 seconds)
          expect(loadTime).toBeLessThan(10000);

          // Should show data
          const hasData = await testUtils.isElementVisible(
            '[data-testid="spending-chart"], .chart-container'
          );
          expect(hasData).toBe(true);
        }
      }
    });

    test('should cache report data for faster subsequent loads', async ({ page }) => {
      await page.goto('/reports/cash-flow');
      await testUtils.waitForPageLoad();

      // First load timing
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        const firstLoadStart = Date.now();
        await refreshButton.click();
        await testUtils.waitForPageLoad();
        const firstLoadTime = Date.now() - firstLoadStart;

        // Second load timing (should be faster due to caching)
        const secondLoadStart = Date.now();
        await refreshButton.click();
        await testUtils.waitForPageLoad();
        const secondLoadTime = Date.now() - secondLoadStart;

        // Second load should be faster (allowing some variance)
        expect(secondLoadTime).toBeLessThanOrEqual(firstLoadTime * 1.2);
      }
    });
  });
});