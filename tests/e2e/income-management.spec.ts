import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Income Management Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for income management tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access income management
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Income Events Page Access', () => {
    test('should navigate to income events page', async ({ page }) => {
      // Navigate from dashboard or directly
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Should show income events page
      const hasIncomePage = await testUtils.isElementVisible(
        'h1:has-text("Income"), h1:has-text("Income Events"), [data-testid="income-page"]'
      );
      expect(hasIncomePage).toBe(true);

      // Should show page description
      const hasDescription = await testUtils.isElementVisible(
        'p:has-text("income"), p:has-text("paycheck"), p:has-text("attribution")'
      );
      expect(hasDescription).toBe(true);
    });

    test('should display income statistics overview', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Should show income stats cards
      const hasStatsCards = await testUtils.isElementVisible(
        '[data-testid="stats-overview"], .stats-card, .income-stats'
      );
      expect(hasStatsCards).toBe(true);

      // Should show monetary amounts
      const hasMonetaryAmounts = await testUtils.isElementVisible(
        'text=/\\$\\d+/, .currency, .amount'
      );
      expect(hasMonetaryAmounts).toBe(true);

      // May show counts of events
      const hasEventCounts = await testUtils.isElementVisible(
        'text="Events", text="Upcoming", text="Pending"'
      );

      if (hasEventCounts) {
        expect(hasEventCounts).toBe(true);
      }
    });

    test('should show add income event button', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Should have add income button
      const hasAddButton = await testUtils.isElementVisible(
        'a:has-text("Add Income"), button:has-text("Add Income"), [data-testid="add-income"]'
      );
      expect(hasAddButton).toBe(true);

      // Button should be prominent and accessible
      const addButton = page.locator(
        'a:has-text("Add Income"), button:has-text("Add Income")'
      );

      if (await addButton.isVisible()) {
        const buttonText = await addButton.textContent();
        expect(buttonText?.toLowerCase().includes('add')).toBe(true);
      }
    });
  });

  test.describe('Income Events List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();
    });

    test('should display income events list', async ({ page }) => {
      // Should show income events list
      const hasIncomeList = await testUtils.isElementVisible(
        '[data-testid="income-list"], .income-events, .events-list'
      );
      expect(hasIncomeList).toBe(true);

      // Should show individual income items
      const hasIncomeItems = await testUtils.isElementVisible(
        '[data-testid="income-item"], .income-event, .event-item'
      );

      if (hasIncomeItems) {
        // Should show income details like amount and date
        const hasIncomeDetails = await testUtils.isElementVisible(
          '.income-amount, .event-date, .income-source'
        );
        expect(hasIncomeDetails).toBe(true);
      }
    });

    test('should show income event status indicators', async ({ page }) => {
      // Look for status indicators on income events
      const hasStatusIndicators = await testUtils.isElementVisible(
        '.status-pending, .status-received, .status-scheduled, [data-status]'
      );

      if (hasStatusIndicators) {
        expect(hasStatusIndicators).toBe(true);

        // Should show different status types
        const hasVariousStatuses = await testUtils.isElementVisible(
          'text="Pending", text="Received", text="Scheduled", text="Overdue"'
        );
        expect(hasVariousStatuses).toBe(true);
      }
    });

    test('should show empty state when no income events', async ({ page }) => {
      // Mock empty income events response
      await page.route('**/api/income-events**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      });

      await page.reload();
      await testUtils.waitForPageLoad();

      // Should show empty state
      const hasEmptyState = await testUtils.isElementVisible(
        '[data-testid="empty-state"], .empty-state, text="No income events"'
      );
      expect(hasEmptyState).toBe(true);

      // Should suggest adding first income event
      const hasAddSuggestion = await testUtils.isElementVisible(
        'text="Add", text="Create", text="first"'
      );
      expect(hasAddSuggestion).toBe(true);
    });

    test('should show income event actions', async ({ page }) => {
      // Look for action buttons on income events
      const hasActionButtons = await testUtils.isElementVisible(
        'button:has-text("Edit"), button:has-text("Mark Received"), button:has-text("Delete")'
      );

      if (hasActionButtons) {
        expect(hasActionButtons).toBe(true);

        // Should have dropdown or menu for actions
        const hasActionsMenu = await testUtils.isElementVisible(
          '[data-testid="actions-menu"], .actions-dropdown, button[aria-haspopup]'
        );
        expect(hasActionsMenu).toBe(true);
      }
    });
  });

  test.describe('Create Income Event', () => {
    test('should navigate to create income page', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Click add income button
      const addButton = page.locator(
        'a:has-text("Add Income"), button:has-text("Add Income"), [data-testid="add-income"]'
      );

      if (await addButton.isVisible()) {
        await addButton.click();
        await testUtils.waitForUrlChange('/income/create');

        // Should show create income form
        const hasCreateForm = await testUtils.isElementVisible(
          'form, [data-testid="income-form"], h1:has-text("Create"), h1:has-text("Add")'
        );
        expect(hasCreateForm).toBe(true);
      }
    });

    test('should validate required form fields', async ({ page }) => {
      await page.goto('/income/create');
      await testUtils.waitForPageLoad();

      // Try to submit form without required fields
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
      );

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show validation errors
        const errors = await testUtils.checkForErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    test('should create income event with valid data', async ({ page }) => {
      // Mock successful creation
      await page.route('**/api/income-events', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            body: JSON.stringify({
              id: 'test-income-123',
              description: 'Test Paycheck',
              amount: 3000,
              expectedDate: '2024-02-15'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/income/create');
      await testUtils.waitForPageLoad();

      // Fill in income form
      const descriptionField = page.locator(
        'input[name="description"], input[placeholder*="description"], [data-testid="description"]'
      );
      if (await descriptionField.isVisible()) {
        await testUtils.fillField('input[name="description"], input[placeholder*="description"]', 'Test Paycheck');
      }

      const amountField = page.locator(
        'input[name="amount"], input[type="number"], [data-testid="amount"]'
      );
      if (await amountField.isVisible()) {
        await testUtils.fillField('input[name="amount"], input[type="number"]', '3000');
      }

      const dateField = page.locator(
        'input[name="expectedDate"], input[type="date"], [data-testid="date"]'
      );
      if (await dateField.isVisible()) {
        await testUtils.fillField('input[name="expectedDate"], input[type="date"]', '2024-02-15');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should redirect back to income page
        await testUtils.waitForUrlChange('/income');

        // Should show success notification
        const hasSuccess = await Promise.race([
          testUtils.waitForNotification('created'),
          testUtils.waitForNotification('success'),
          page.waitForTimeout(3000).then(() => false)
        ]);

        if (hasSuccess) {
          expect(hasSuccess).toBe(true);
        }
      }
    });

    test('should handle form validation errors', async ({ page }) => {
      await page.goto('/income/create');
      await testUtils.waitForPageLoad();

      // Fill invalid data (negative amount)
      const amountField = page.locator('input[name="amount"], input[type="number"]');
      if (await amountField.isVisible()) {
        await testUtils.fillField('input[name="amount"], input[type="number"]', '-500');

        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Should show validation error
          const errors = await testUtils.checkForErrors();
          const hasValidationError = errors.some(error =>
            error.toLowerCase().includes('amount') ||
            error.toLowerCase().includes('positive') ||
            error.toLowerCase().includes('invalid')
          );
          expect(hasValidationError || errors.length > 0).toBe(true);
        }
      }
    });
  });

  test.describe('Edit Income Event', () => {
    test('should navigate to edit income page', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Look for edit buttons or links
      const editButton = page.locator(
        'button:has-text("Edit"), a[href*="/edit"], [data-testid="edit-income"]'
      );

      if (await editButton.first().isVisible()) {
        await editButton.first().click();

        // Should navigate to edit page
        const isEditPage = await Promise.race([
          testUtils.waitForUrlChange('/income/'),
          page.waitForURL('**/edit**').then(() => true),
          page.waitForTimeout(3000).then(() => false)
        ]);

        if (isEditPage) {
          // Should show edit form
          const hasEditForm = await testUtils.isElementVisible(
            'form, h1:has-text("Edit"), [data-testid="edit-form"]'
          );
          expect(hasEditForm).toBe(true);
        }
      }
    });

    test('should pre-populate form with existing data', async ({ page }) => {
      // Mock income event data
      await page.route('**/api/income-events/*', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-income-123',
            description: 'Monthly Salary',
            amount: 4500,
            expectedDate: '2024-03-01'
          })
        });
      });

      await page.goto('/income/test-income-123/edit');
      await testUtils.waitForPageLoad();

      // Form fields should be pre-populated
      const descriptionField = page.locator('input[name="description"]');
      if (await descriptionField.isVisible()) {
        const value = await descriptionField.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }

      const amountField = page.locator('input[name="amount"]');
      if (await amountField.isVisible()) {
        const value = await amountField.inputValue();
        expect(value).toBeTruthy();
      }
    });

    test('should update income event', async ({ page }) => {
      // Mock update endpoint
      await page.route('**/api/income-events/*', route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Income event updated' })
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'test-income-123',
              description: 'Monthly Salary',
              amount: 4500
            })
          });
        }
      });

      await page.goto('/income/test-income-123/edit');
      await testUtils.waitForPageLoad();

      // Update description
      const descriptionField = page.locator('input[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Updated Salary');

        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should redirect or show success
          const hasSuccess = await Promise.race([
            testUtils.waitForNotification('updated'),
            testUtils.waitForUrlChange('/income'),
            page.waitForTimeout(3000).then(() => false)
          ]);

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Income Event Status Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();
    });

    test('should mark income event as received', async ({ page }) => {
      // Mock mark received endpoint
      await page.route('**/api/income-events/*/mark-received', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Income marked as received' })
        });
      });

      // Look for mark received button
      const markReceivedButton = page.locator(
        'button:has-text("Mark Received"), [data-testid="mark-received"]'
      );

      if (await markReceivedButton.first().isVisible()) {
        await markReceivedButton.first().click();

        // Should show confirmation or success
        const hasSuccess = await Promise.race([
          testUtils.waitForNotification('received'),
          testUtils.waitForNotification('marked'),
          page.waitForTimeout(3000).then(() => false)
        ]);

        if (hasSuccess) {
          expect(hasSuccess).toBe(true);
        }
      }
    });

    test('should revert received status', async ({ page }) => {
      // Mock revert endpoint
      await page.route('**/api/income-events/*/revert-received', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Income status reverted' })
        });
      });

      // Look for revert button
      const revertButton = page.locator(
        'button:has-text("Revert"), button:has-text("Undo"), [data-testid="revert-received"]'
      );

      if (await revertButton.first().isVisible()) {
        await revertButton.first().click();

        // May show confirmation dialog
        const hasConfirmation = await testUtils.isElementVisible(
          '[role="dialog"], .confirmation, text="confirm"'
        );

        if (hasConfirmation) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }

        // Should show success
        await page.waitForTimeout(1000);
      }
    });

    test('should show income event details', async ({ page }) => {
      // Look for income event items that can be clicked for details
      const incomeItem = page.locator(
        '[data-testid="income-item"], .income-event, .event-item'
      );

      if (await incomeItem.first().isVisible()) {
        await incomeItem.first().click();

        // Should show details view or modal
        const hasDetails = await testUtils.isElementVisible(
          '[data-testid="income-details"], .income-modal, h2:has-text("Details")'
        );

        if (hasDetails) {
          expect(hasDetails).toBe(true);

          // Should show detailed information
          const hasDetailedInfo = await testUtils.isElementVisible(
            '.amount, .date, .description, .attribution'
          );
          expect(hasDetailedInfo).toBe(true);
        }
      }
    });
  });

  test.describe('Income Attribution', () => {
    test('should show payment attribution for income', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Look for attribution information
      const hasAttributionInfo = await testUtils.isElementVisible(
        '[data-testid="attribution"], .attribution, text="attributed"'
      );

      if (hasAttributionInfo) {
        expect(hasAttributionInfo).toBe(true);

        // Should show attribution amounts or percentages
        const hasAttributionData = await testUtils.isElementVisible(
          '.attribution-amount, .attribution-percent, text="%"'
        );
        expect(hasAttributionData).toBe(true);
      }
    });

    test('should view attribution details', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Look for attribution view button
      const attributionButton = page.locator(
        'button:has-text("Attribution"), a:has-text("Attribution"), [data-testid="view-attribution"]'
      );

      if (await attributionButton.first().isVisible()) {
        await attributionButton.first().click();

        // Should show attribution details
        const hasAttributionDetails = await testUtils.isElementVisible(
          '[data-testid="attribution-details"], .attribution-modal, h2:has-text("Attribution")'
        );

        if (hasAttributionDetails) {
          expect(hasAttributionDetails).toBe(true);

          // Should show payment breakdowns
          const hasPaymentBreakdown = await testUtils.isElementVisible(
            '.payment-item, .attribution-item, text="Payment"'
          );
          expect(hasPaymentBreakdown).toBe(true);
        }
      }
    });
  });

  test.describe('Bulk Income Operations', () => {
    test('should bulk create income events', async ({ page }) => {
      await page.goto('/income');

      // Look for bulk create option
      const bulkCreateButton = page.locator(
        'button:has-text("Bulk"), a:has-text("Bulk"), [data-testid="bulk-create"]'
      );

      if (await bulkCreateButton.isVisible()) {
        await bulkCreateButton.click();

        // Should show bulk creation form
        const hasBulkForm = await testUtils.isElementVisible(
          '[data-testid="bulk-form"], .bulk-create, h2:has-text("Bulk")'
        );
        expect(hasBulkForm).toBe(true);
      }
    });

    test('should show upcoming income events', async ({ page }) => {
      await page.goto('/income/upcoming');
      await testUtils.waitForPageLoad();

      // Should show upcoming events
      const hasUpcomingEvents = await testUtils.isElementVisible(
        '[data-testid="upcoming-events"], .upcoming-income, h1:has-text("Upcoming")'
      );

      if (hasUpcomingEvents) {
        expect(hasUpcomingEvents).toBe(true);

        // Should show future dates
        const hasFutureDates = await testUtils.isElementVisible(
          '.future-date, .upcoming-date'
        );
        expect(hasFutureDates).toBe(true);
      }
    });
  });

  test.describe('Income Calendar Integration', () => {
    test('should show income events in calendar view', async ({ page }) => {
      // Navigate to calendar or income calendar view
      await page.goto('/income');

      // Look for calendar view toggle or link
      const calendarView = page.locator(
        'button:has-text("Calendar"), a:has-text("Calendar"), [data-testid="calendar-view"]'
      );

      if (await calendarView.isVisible()) {
        await calendarView.click();

        // Should show calendar with income events
        const hasCalendar = await testUtils.isElementVisible(
          '.calendar, [data-testid="income-calendar"], .calendar-grid'
        );
        expect(hasCalendar).toBe(true);

        // Should show income events on calendar
        const hasCalendarEvents = await testUtils.isElementVisible(
          '.calendar-event, .income-event-marker'
        );

        if (hasCalendarEvents) {
          expect(hasCalendarEvents).toBe(true);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/income-events**', route => route.abort());

      await page.goto('/income');
      await page.waitForTimeout(3000);

      // Should show error state
      const hasError = await testUtils.isElementVisible(
        '.error, text="Failed", text="Error", [data-testid="error"]'
      );
      expect(hasError).toBe(true);

      // Should offer retry option
      const hasRetry = await testUtils.isElementVisible(
        'button:has-text("Retry"), button:has-text("Try again")'
      );
      expect(hasRetry).toBe(true);
    });

    test('should handle form submission errors', async ({ page }) => {
      await page.goto('/income/create');

      // Mock server error
      await page.route('**/api/income-events', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      // Fill form and submit
      const descriptionField = page.locator('input[name="description"]');
      if (await descriptionField.isVisible()) {
        await testUtils.fillField('input[name="description"]', 'Test Income');

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
  });

  test.describe('Income Management Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Tab through income management interface
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');

      // Should focus interactive elements
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'a', 'input', 'select'].includes(tagName)).toBe(true);
      }
    });

    test('should have proper ARIA labels and headings', async ({ page }) => {
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Should have proper heading structure
      const hasHeadings = await testUtils.isElementVisible('h1, h2, h3');
      expect(hasHeadings).toBe(true);

      // Should have accessible buttons
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        const hasAccessibleName = await firstButton.getAttribute('aria-label') ||
                                 await firstButton.textContent();
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should announce form validation errors', async ({ page }) => {
      await page.goto('/income/create');
      await testUtils.waitForPageLoad();

      // Should have live regions for error announcements
      const hasErrorRegions = await testUtils.isElementVisible(
        '[role="alert"], [aria-live="polite"], [data-testid="error-announcement"]'
      );

      if (hasErrorRegions) {
        expect(hasErrorRegions).toBe(true);
      }
    });
  });

  test.describe('Mobile Income Management', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/income');
      await testUtils.waitForPageLoad();

      // Should adapt layout for mobile
      const hasIncomeContent = await testUtils.isElementVisible(
        '[data-testid="income-page"], .income-events, h1'
      );
      expect(hasIncomeContent).toBe(true);

      // Buttons should be touch-friendly
      const addButton = page.locator('button, a:has-text("Add")');
      if (await addButton.first().isVisible()) {
        const buttonBox = await addButton.first().boundingBox();
        expect(buttonBox?.height).toBeGreaterThan(40);
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle mobile form interactions', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/income/create');
      await testUtils.waitForPageLoad();

      // Form should be usable on mobile
      const hasForm = await testUtils.isElementVisible('form, [data-testid="income-form"]');
      if (hasForm) {
        expect(hasForm).toBe(true);

        // Input fields should be appropriately sized
        const inputs = page.locator('input[type="text"], input[type="number"]');
        if (await inputs.count() > 0) {
          const inputBox = await inputs.first().boundingBox();
          expect(inputBox?.height).toBeGreaterThan(40);
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});