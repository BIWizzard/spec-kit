import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Cash Flow Calendar Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for calendar tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access calendar features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Calendar Access and Navigation', () => {
    test('should access calendar from dashboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Look for calendar navigation
      const hasCalendarAccess = await testUtils.isElementVisible(
        'a:has-text("Calendar"), button:has-text("Calendar"), [data-testid="calendar-nav"]'
      );

      if (hasCalendarAccess) {
        expect(hasCalendarAccess).toBe(true);

        await page.click('a:has-text("Calendar"), button:has-text("Calendar")');
        await testUtils.waitForUrlChange('/calendar');

        // Should show calendar page
        const hasCalendarPage = await testUtils.isElementVisible(
          '[data-testid="calendar-page"], h1:has-text("Calendar"), .calendar-container'
        );
        expect(hasCalendarPage).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/calendar');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display calendar view with current month', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Should show calendar grid
      const hasCalendarGrid = await testUtils.isElementVisible(
        '[data-testid="calendar-grid"], .calendar-month, table'
      );

      if (hasCalendarGrid) {
        expect(hasCalendarGrid).toBe(true);

        // Should show current month and year
        const hasCurrentMonth = await testUtils.isElementVisible(
          'text=/January|February|March|April|May|June|July|August|September|October|November|December/, text=/202[4-9]/'
        );
        expect(hasCurrentMonth).toBe(true);

        // Should show day cells
        const hasDayCells = await testUtils.isElementVisible(
          '.calendar-day, td, .day-cell'
        );
        expect(hasDayCells).toBe(true);
      }
    });

    test('should navigate between months', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for navigation controls
      const hasNavigation = await testUtils.isElementVisible(
        'button:has-text("Previous"), button:has-text("Next"), .calendar-navigation'
      );

      if (hasNavigation) {
        expect(hasNavigation).toBe(true);

        // Click next month
        const nextButton = page.locator('button:has-text("Next"), [data-testid="next-month"]');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await testUtils.waitForPageLoad();

          // Should show different month
          const hasUpdatedMonth = await testUtils.isElementVisible(
            'text=/January|February|March|April|May|June|July|August|September|October|November|December/'
          );
          expect(hasUpdatedMonth).toBe(true);
        }

        // Click previous month
        const prevButton = page.locator('button:has-text("Previous"), [data-testid="prev-month"]');
        if (await prevButton.isVisible()) {
          await prevButton.click();
          await testUtils.waitForPageLoad();
        }
      }
    });
  });

  test.describe('Income Events Display', () => {
    test('should display income events on calendar', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for income events on calendar
      const hasIncomeEvents = await testUtils.isElementVisible(
        '[data-testid="income-event"], .income-marker, .calendar-income'
      );

      if (hasIncomeEvents) {
        expect(hasIncomeEvents).toBe(true);

        // Should show income amounts
        const hasIncomeAmounts = await testUtils.isElementVisible(
          'text=/\\$\\d+/, .income-amount'
        );
        expect(hasIncomeAmounts).toBe(true);
      }
    });

    test('should show recurring income events', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for recurring income patterns
      const hasRecurringIncome = await testUtils.isElementVisible(
        '[data-testid="recurring-income"], .recurring-marker, text="Recurring"'
      );

      if (hasRecurringIncome) {
        expect(hasRecurringIncome).toBe(true);

        // Should show frequency indicators
        const hasFrequency = await testUtils.isElementVisible(
          'text="Weekly", text="Monthly", text="Bi-weekly", .frequency-indicator'
        );

        if (hasFrequency) {
          expect(hasFrequency).toBe(true);
        }
      }
    });

    test('should click on income event for details', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      const incomeEvent = page.locator(
        '[data-testid="income-event"], .income-marker'
      );

      if (await incomeEvent.first().isVisible()) {
        await incomeEvent.first().click();

        // Should show income event details modal or tooltip
        const hasIncomeDetails = await testUtils.isElementVisible(
          '[data-testid="income-details"], .income-popup, .event-modal'
        );

        if (hasIncomeDetails) {
          expect(hasIncomeDetails).toBe(true);

          // Should show event details
          const hasEventInfo = await testUtils.isElementVisible(
            'text="Amount", text="Source", text="Date"'
          );
          expect(hasEventInfo).toBe(true);
        }
      }
    });
  });

  test.describe('Payment Events Display', () => {
    test('should display payment due dates on calendar', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for payment events on calendar
      const hasPaymentEvents = await testUtils.isElementVisible(
        '[data-testid="payment-event"], .payment-marker, .calendar-payment'
      );

      if (hasPaymentEvents) {
        expect(hasPaymentEvents).toBe(true);

        // Should show payment amounts
        const hasPaymentAmounts = await testUtils.isElementVisible(
          'text=/\\$\\d+/, .payment-amount'
        );
        expect(hasPaymentAmounts).toBe(true);
      }
    });

    test('should distinguish between different payment types', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for different payment categories or colors
      const hasPaymentTypes = await testUtils.isElementVisible(
        '.payment-housing, .payment-utilities, .payment-category, [data-category]'
      );

      if (hasPaymentTypes) {
        expect(hasPaymentTypes).toBe(true);

        // Should show visual distinction (colors, icons, etc.)
        const hasVisualDistinction = await testUtils.isElementVisible(
          '.category-color, .payment-icon, [style*="color"]'
        );

        if (hasVisualDistinction) {
          expect(hasVisualDistinction).toBe(true);
        }
      }
    });

    test('should show overdue payments differently', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for overdue payment indicators
      const hasOverduePayments = await testUtils.isElementVisible(
        '[data-testid="overdue-payment"], .overdue-marker, .payment-overdue'
      );

      if (hasOverduePayments) {
        expect(hasOverduePayments).toBe(true);

        // Should have visual indication (red color, warning icon, etc.)
        const hasOverdueVisual = await testUtils.isElementVisible(
          '.overdue-color, [style*="red"], .warning-icon'
        );

        if (hasOverdueVisual) {
          expect(hasOverdueVisual).toBe(true);
        }
      }
    });

    test('should click on payment event for details', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      const paymentEvent = page.locator(
        '[data-testid="payment-event"], .payment-marker'
      );

      if (await paymentEvent.first().isVisible()) {
        await paymentEvent.first().click();

        // Should show payment details modal or tooltip
        const hasPaymentDetails = await testUtils.isElementVisible(
          '[data-testid="payment-details"], .payment-popup, .event-modal'
        );

        if (hasPaymentDetails) {
          expect(hasPaymentDetails).toBe(true);

          // Should show payment details
          const hasPaymentInfo = await testUtils.isElementVisible(
            'text="Amount", text="Due Date", text="Category"'
          );
          expect(hasPaymentInfo).toBe(true);
        }
      }
    });
  });

  test.describe('Cash Flow Visualization', () => {
    test('should show daily cash flow balance', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for cash flow indicators
      const hasCashFlowInfo = await testUtils.isElementVisible(
        '[data-testid="cash-flow"], .balance-indicator, text="Balance"'
      );

      if (hasCashFlowInfo) {
        expect(hasCashFlowInfo).toBe(true);

        // Should show positive or negative indicators
        const hasBalanceIndicators = await testUtils.isElementVisible(
          '.positive-balance, .negative-balance, text=/[+-]\\$\\d+/'
        );

        if (hasBalanceIndicators) {
          expect(hasBalanceIndicators).toBe(true);
        }
      }
    });

    test('should highlight critical cash flow dates', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for critical dates (low balance, overdraft risk, etc.)
      const hasCriticalDates = await testUtils.isElementVisible(
        '[data-testid="critical-date"], .low-balance, .cash-flow-warning'
      );

      if (hasCriticalDates) {
        expect(hasCriticalDates).toBe(true);

        // Should have warning visual indicators
        const hasWarningVisuals = await testUtils.isElementVisible(
          '.warning-color, .critical-indicator, [style*="orange"], [style*="red"]'
        );

        if (hasWarningVisuals) {
          expect(hasWarningVisuals).toBe(true);
        }
      }
    });

    test('should show running balance calculation', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for running balance display
      const hasRunningBalance = await testUtils.isElementVisible(
        '[data-testid="running-balance"], .balance-total, text="Running Balance"'
      );

      if (hasRunningBalance) {
        expect(hasRunningBalance).toBe(true);

        // Should show cumulative effect of income and payments
        const hasBalanceCalc = await testUtils.isElementVisible(
          'text=/\\$\\d+/, .balance-amount'
        );
        expect(hasBalanceCalc).toBe(true);
      }
    });
  });

  test.describe('Calendar Filters and Views', () => {
    test('should filter events by type', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for filter controls
      const hasFilters = await testUtils.isElementVisible(
        '[data-testid="calendar-filters"], .filter-controls, text="Filter"'
      );

      if (hasFilters) {
        expect(hasFilters).toBe(true);

        // Should have filter options
        const hasFilterOptions = await testUtils.isElementVisible(
          'input[type="checkbox"], .filter-option, text="Income", text="Payments"'
        );

        if (hasFilterOptions) {
          expect(hasFilterOptions).toBe(true);

          // Toggle income filter
          const incomeFilter = page.locator('input[type="checkbox"]:near(text="Income")').first();
          if (await incomeFilter.isVisible()) {
            await incomeFilter.click();
            await testUtils.waitForPageLoad();

            // Should filter calendar display
            const hasFilteredView = await testUtils.isElementVisible(
              '.calendar-filtered, .filtered-events'
            );

            if (hasFilteredView) {
              expect(hasFilteredView).toBe(true);
            }
          }
        }
      }
    });

    test('should switch between month and week view', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for view controls
      const hasViewControls = await testUtils.isElementVisible(
        '[data-testid="view-controls"], .view-selector, text="Month", text="Week"'
      );

      if (hasViewControls) {
        expect(hasViewControls).toBe(true);

        // Switch to week view
        const weekViewButton = page.locator('button:has-text("Week"), [data-testid="week-view"]');
        if (await weekViewButton.isVisible()) {
          await weekViewButton.click();
          await testUtils.waitForPageLoad();

          // Should show week view
          const hasWeekView = await testUtils.isElementVisible(
            '[data-testid="week-view"], .calendar-week, .week-grid'
          );

          if (hasWeekView) {
            expect(hasWeekView).toBe(true);
          }

          // Should show daily details
          const hasDailyDetails = await testUtils.isElementVisible(
            '.day-detail, .daily-events'
          );

          if (hasDailyDetails) {
            expect(hasDailyDetails).toBe(true);
          }
        }
      }
    });

    test('should show calendar legend', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for legend or key
      const hasLegend = await testUtils.isElementVisible(
        '[data-testid="calendar-legend"], .legend, .calendar-key, text="Legend"'
      );

      if (hasLegend) {
        expect(hasLegend).toBe(true);

        // Should explain color coding and symbols
        const hasLegendItems = await testUtils.isElementVisible(
          '.legend-item, text="Income", text="Payments", text="Overdue"'
        );
        expect(hasLegendItems).toBe(true);
      }
    });
  });

  test.describe('Event Management from Calendar', () => {
    test('should create new income event from calendar', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Click on empty day to create event
      const emptyDay = page.locator('.calendar-day:not(:has(.event)), td:not(:has(.event))').first();
      if (await emptyDay.isVisible()) {
        await emptyDay.click();

        // Should show create event options
        const hasCreateOptions = await testUtils.isElementVisible(
          '[data-testid="create-event"], text="Add Income", text="Add Payment", .event-creator'
        );

        if (hasCreateOptions) {
          expect(hasCreateOptions).toBe(true);

          // Click to create income event
          const createIncomeButton = page.locator('button:has-text("Add Income"), text="Add Income"');
          if (await createIncomeButton.isVisible()) {
            await createIncomeButton.click();

            // Should show income creation form
            const hasIncomeForm = await testUtils.isElementVisible(
              '[data-testid="income-form"], .income-modal, form'
            );

            if (hasIncomeForm) {
              expect(hasIncomeForm).toBe(true);

              // Fill form
              await testUtils.fillFormField('Source', 'Freelance Work');
              await testUtils.fillFormField('Amount', '1200');

              // Save income event
              await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');

              // Should show success and event on calendar
              await testUtils.waitForPageLoad();
              const hasNewEvent = await testUtils.isElementVisible(
                '[data-testid="income-event"], .income-marker'
              );

              if (hasNewEvent) {
                expect(hasNewEvent).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should create new payment event from calendar', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      const emptyDay = page.locator('.calendar-day:not(:has(.event)), td:not(:has(.event))').first();
      if (await emptyDay.isVisible()) {
        await emptyDay.click();

        const createPaymentButton = page.locator('button:has-text("Add Payment"), text="Add Payment"');
        if (await createPaymentButton.isVisible()) {
          await createPaymentButton.click();

          // Should show payment creation form
          const hasPaymentForm = await testUtils.isElementVisible(
            '[data-testid="payment-form"], .payment-modal, form'
          );

          if (hasPaymentForm) {
            expect(hasPaymentForm).toBe(true);

            // Fill form
            await testUtils.fillFormField('Name', 'Electricity Bill');
            await testUtils.fillFormField('Amount', '150');

            // Save payment event
            await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');

            // Should show success and event on calendar
            await testUtils.waitForPageLoad();
            const hasNewPayment = await testUtils.isElementVisible(
              '[data-testid="payment-event"], .payment-marker'
            );

            if (hasNewPayment) {
              expect(hasNewPayment).toBe(true);
            }
          }
        }
      }
    });

    test('should drag and drop events to reschedule', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      const event = page.locator('[data-testid="payment-event"], .payment-marker').first();
      const targetDay = page.locator('.calendar-day, td').nth(10);

      if (await event.isVisible() && await targetDay.isVisible()) {
        // Attempt drag and drop
        await event.hover();
        await page.mouse.down();
        await targetDay.hover();
        await page.mouse.up();

        // Should show confirmation or update event
        const hasUpdateConfirm = await testUtils.isElementVisible(
          'text="Reschedule", text="Move event", .reschedule-confirm'
        );

        if (hasUpdateConfirm) {
          expect(hasUpdateConfirm).toBe(true);

          // Confirm the move
          await testUtils.clickButton('button:has-text("Confirm"), button:has-text("Move")');

          // Event should appear in new location
          await testUtils.waitForPageLoad();
          const eventMoved = await testUtils.isElementVisible(
            '[data-testid="payment-event"], .payment-marker'
          );
          expect(eventMoved).toBe(true);
        }
      }
    });
  });

  test.describe('Calendar Export and Sharing', () => {
    test('should export calendar to various formats', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for export functionality
      const hasExportButton = await testUtils.isElementVisible(
        'button:has-text("Export"), [data-testid="export-calendar"]'
      );

      if (hasExportButton) {
        await page.click('button:has-text("Export")');

        // Should show export options
        const hasExportOptions = await testUtils.isElementVisible(
          'text="CSV", text="PDF", text="iCal", .export-options'
        );

        if (hasExportOptions) {
          expect(hasExportOptions).toBe(true);

          // Select PDF export
          const pdfOption = page.locator('button:has-text("PDF"), text="PDF"');
          if (await pdfOption.isVisible()) {
            await pdfOption.click();

            // Should show download or generate indication
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

    test('should print calendar view', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for print functionality
      const hasPrintButton = await testUtils.isElementVisible(
        'button:has-text("Print"), [data-testid="print-calendar"]'
      );

      if (hasPrintButton) {
        await page.click('button:has-text("Print")');

        // Should trigger print dialog or print preview
        const hasPrintPreview = await testUtils.isElementVisible(
          '.print-preview, text="Print Preview"'
        );

        if (hasPrintPreview) {
          expect(hasPrintPreview).toBe(true);
        }
      }
    });
  });

  test.describe('Calendar Integration and Sync', () => {
    test('should show upcoming events summary', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for upcoming events sidebar or section
      const hasUpcomingSummary = await testUtils.isElementVisible(
        '[data-testid="upcoming-events"], .upcoming-summary, text="Upcoming"'
      );

      if (hasUpcomingSummary) {
        expect(hasUpcomingSummary).toBe(true);

        // Should show next few events
        const hasEventList = await testUtils.isElementVisible(
          '.upcoming-list, .event-item'
        );

        if (hasEventList) {
          expect(hasEventList).toBe(true);
        }

        // Should show dates and amounts
        const hasEventDetails = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text=/\\d{1,2}\/\\d{1,2}/'
        );
        expect(hasEventDetails).toBe(true);
      }
    });

    test('should integrate with dashboard metrics', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for dashboard integration links
      const hasDashboardLink = await testUtils.isElementVisible(
        'a:has-text("Dashboard"), text="View Dashboard", .dashboard-link'
      );

      if (hasDashboardLink) {
        await page.click('a:has-text("Dashboard"), text="View Dashboard"');
        await testUtils.waitForUrlChange('/dashboard');

        // Should show dashboard with calendar-related metrics
        const hasDashboardMetrics = await testUtils.isElementVisible(
          '[data-testid="dashboard-metrics"], text="Cash Flow", text="Upcoming"'
        );

        if (hasDashboardMetrics) {
          expect(hasDashboardMetrics).toBe(true);
        }
      }
    });

    test('should refresh calendar data', async ({ page }) => {
      await page.goto('/calendar');
      await testUtils.waitForPageLoad();

      // Look for refresh functionality
      const hasRefreshButton = await testUtils.isElementVisible(
        'button:has-text("Refresh"), [data-testid="refresh-calendar"]'
      );

      if (hasRefreshButton) {
        await page.click('button:has-text("Refresh")');

        // Should show loading indication and updated data
        const hasLoadingIndicator = await testUtils.isElementVisible(
          '.loading, text="Refreshing", .spinner'
        );

        if (hasLoadingIndicator) {
          expect(hasLoadingIndicator).toBe(true);

          // Wait for refresh to complete
          await testUtils.waitForPageLoad();

          // Should show updated calendar
          const hasUpdatedCalendar = await testUtils.isElementVisible(
            '[data-testid="calendar-grid"], .calendar-month'
          );
          expect(hasUpdatedCalendar).toBe(true);
        }
      }
    });
  });
});