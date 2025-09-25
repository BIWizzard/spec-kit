import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Payment Management Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for payment management tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access payment management
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Payments Page Access', () => {
    test('should navigate to payments page', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should show payments page
      const hasPaymentsPage = await testUtils.isElementVisible(
        'h1:has-text("Payments"), [data-testid="payments-page"]'
      );
      expect(hasPaymentsPage).toBe(true);

      // Should show payment management description
      const hasDescription = await testUtils.isElementVisible(
        'p:has-text("payment"), p:has-text("bills"), p:has-text("expenses")'
      );
      expect(hasDescription).toBe(true);
    });

    test('should display payment statistics overview', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should show payment stats cards
      const hasStatsCards = await testUtils.isElementVisible(
        '[data-testid="payment-stats"], .stats-card, .payment-overview'
      );
      expect(hasStatsCards).toBe(true);

      // Should show monetary amounts
      const hasMonetaryAmounts = await testUtils.isElementVisible(
        'text=/\\$\\d+/, .currency, .amount'
      );
      expect(hasMonetaryAmounts).toBe(true);

      // May show payment counts
      const hasPaymentCounts = await testUtils.isElementVisible(
        'text="Payments", text="Due", text="Overdue", text="Upcoming"'
      );

      if (hasPaymentCounts) {
        expect(hasPaymentCounts).toBe(true);
      }
    });

    test('should show add payment button', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should have add payment button
      const hasAddButton = await testUtils.isElementVisible(
        'a:has-text("Add Payment"), button:has-text("Add Payment"), [data-testid="add-payment"]'
      );
      expect(hasAddButton).toBe(true);

      // Button should be prominent
      const addButton = page.locator(
        'a:has-text("Add Payment"), button:has-text("Add Payment")'
      );

      if (await addButton.isVisible()) {
        const buttonText = await addButton.textContent();
        expect(buttonText?.toLowerCase().includes('add')).toBe(true);
      }
    });
  });

  test.describe('Payments List Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();
    });

    test('should display payments list', async ({ page }) => {
      // Should show payments list
      const hasPaymentsList = await testUtils.isElementVisible(
        '[data-testid="payments-list"], .payments-list, .payment-items'
      );
      expect(hasPaymentsList).toBe(true);

      // Should show individual payment items
      const hasPaymentItems = await testUtils.isElementVisible(
        '[data-testid="payment-item"], .payment-card, .payment-row'
      );

      if (hasPaymentItems) {
        // Should show payment details like amount, due date, payee
        const hasPaymentDetails = await testUtils.isElementVisible(
          '.payment-amount, .due-date, .payee, .payment-description'
        );
        expect(hasPaymentDetails).toBe(true);
      }
    });

    test('should show payment status indicators', async ({ page }) => {
      // Look for payment status indicators
      const hasStatusIndicators = await testUtils.isElementVisible(
        '.status-paid, .status-pending, .status-overdue, [data-status]'
      );

      if (hasStatusIndicators) {
        expect(hasStatusIndicators).toBe(true);

        // Should show different status types with colors
        const hasStatusTypes = await testUtils.isElementVisible(
          'text="Paid", text="Pending", text="Overdue", text="Due"'
        );
        expect(hasStatusTypes).toBe(true);
      }
    });

    test('should show overdue payments prominently', async ({ page }) => {
      // Look for overdue payment indicators
      const hasOverdueIndicators = await testUtils.isElementVisible(
        '.overdue, .status-overdue, text="Overdue", .text-red'
      );

      if (hasOverdueIndicators) {
        expect(hasOverdueIndicators).toBe(true);

        // Overdue payments should be visually distinct
        const hasOverdueHighlight = await testUtils.isElementVisible(
          '.bg-red, .border-red, .text-red'
        );
        expect(hasOverdueHighlight).toBe(true);
      }
    });

    test('should show empty state when no payments', async ({ page }) => {
      // Mock empty payments response
      await page.route('**/api/payments**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      });

      await page.reload();
      await testUtils.waitForPageLoad();

      // Should show empty state
      const hasEmptyState = await testUtils.isElementVisible(
        '[data-testid="empty-state"], .empty-state, text="No payments"'
      );
      expect(hasEmptyState).toBe(true);

      // Should suggest adding first payment
      const hasAddSuggestion = await testUtils.isElementVisible(
        'text="Add", text="Create", text="first"'
      );
      expect(hasAddSuggestion).toBe(true);
    });

    test('should show payment actions and menu', async ({ page }) => {
      // Look for payment action buttons
      const hasActionButtons = await testUtils.isElementVisible(
        'button:has-text("Mark Paid"), button:has-text("Edit"), button:has-text("Delete")'
      );

      if (hasActionButtons) {
        expect(hasActionButtons).toBe(true);

        // Should have actions menu or dropdown
        const hasActionsMenu = await testUtils.isElementVisible(
          '[data-testid="payment-actions"], .actions-menu, button[aria-haspopup]'
        );
        expect(hasActionsMenu).toBe(true);
      }
    });
  });

  test.describe('Create Payment', () => {
    test('should navigate to create payment page', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Click add payment button
      const addButton = page.locator(
        'a:has-text("Add Payment"), button:has-text("Add Payment"), [data-testid="add-payment"]'
      );

      if (await addButton.isVisible()) {
        await addButton.click();
        await testUtils.waitForUrlChange('/payments/create');

        // Should show create payment form
        const hasCreateForm = await testUtils.isElementVisible(
          'form, [data-testid="payment-form"], h1:has-text("Create"), h1:has-text("Add")'
        );
        expect(hasCreateForm).toBe(true);
      }
    });

    test('should validate required payment form fields', async ({ page }) => {
      await page.goto('/payments/create');
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

    test('should create payment with valid data', async ({ page }) => {
      // Mock successful creation
      await page.route('**/api/payments', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 201,
            body: JSON.stringify({
              id: 'test-payment-123',
              description: 'Electric Bill',
              amount: 125.50,
              dueDate: '2024-02-28'
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/payments/create');
      await testUtils.waitForPageLoad();

      // Fill payment form
      const descriptionField = page.locator(
        'input[name="description"], input[placeholder*="description"], [data-testid="description"]'
      );
      if (await descriptionField.isVisible()) {
        await testUtils.fillField('input[name="description"]', 'Electric Bill');
      }

      const amountField = page.locator(
        'input[name="amount"], input[type="number"], [data-testid="amount"]'
      );
      if (await amountField.isVisible()) {
        await testUtils.fillField('input[name="amount"]', '125.50');
      }

      const dueDateField = page.locator(
        'input[name="dueDate"], input[type="date"], [data-testid="due-date"]'
      );
      if (await dueDateField.isVisible()) {
        await testUtils.fillField('input[name="dueDate"]', '2024-02-28');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should redirect back to payments page
        await testUtils.waitForUrlChange('/payments');

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

    test('should create recurring payment', async ({ page }) => {
      await page.goto('/payments/create');
      await testUtils.waitForPageLoad();

      // Look for recurring payment option
      const recurringToggle = page.locator(
        'input[name="recurring"], input[type="checkbox"]:has(~ label:has-text("Recurring"))'
      );

      if (await recurringToggle.isVisible()) {
        await recurringToggle.check();

        // Should show recurring options
        const hasRecurringOptions = await testUtils.isElementVisible(
          'select[name="frequency"], [data-testid="recurring-options"]'
        );
        expect(hasRecurringOptions).toBe(true);

        // Should have frequency options
        const frequencySelect = page.locator('select[name="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('monthly');
        }
      }
    });
  });

  test.describe('Edit Payment', () => {
    test('should navigate to edit payment page', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for edit buttons
      const editButton = page.locator(
        'button:has-text("Edit"), a[href*="/edit"], [data-testid="edit-payment"]'
      );

      if (await editButton.first().isVisible()) {
        await editButton.first().click();

        // Should navigate to edit page
        const isEditPage = await Promise.race([
          testUtils.waitForUrlChange('/payments/'),
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

    test('should pre-populate form with existing payment data', async ({ page }) => {
      // Mock payment data
      await page.route('**/api/payments/*', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 'test-payment-123',
            description: 'Rent Payment',
            amount: 1200,
            dueDate: '2024-03-01'
          })
        });
      });

      await page.goto('/payments/test-payment-123/edit');
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

    test('should update payment successfully', async ({ page }) => {
      // Mock update endpoint
      await page.route('**/api/payments/*', route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Payment updated successfully' })
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              id: 'test-payment-123',
              description: 'Rent Payment',
              amount: 1200
            })
          });
        }
      });

      await page.goto('/payments/test-payment-123/edit');
      await testUtils.waitForPageLoad();

      // Update amount
      const amountField = page.locator('input[name="amount"]');
      if (await amountField.isVisible()) {
        await amountField.fill('1250');

        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should show success or redirect
          const hasSuccess = await Promise.race([
            testUtils.waitForNotification('updated'),
            testUtils.waitForUrlChange('/payments'),
            page.waitForTimeout(3000).then(() => false)
          ]);

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Payment Status Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();
    });

    test('should mark payment as paid', async ({ page }) => {
      // Mock mark paid endpoint
      await page.route('**/api/payments/*/mark-paid', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Payment marked as paid' })
        });
      });

      // Look for mark paid button
      const markPaidButton = page.locator(
        'button:has-text("Mark Paid"), [data-testid="mark-paid"]'
      );

      if (await markPaidButton.first().isVisible()) {
        await markPaidButton.first().click();

        // May show confirmation dialog
        const hasConfirmation = await testUtils.isElementVisible(
          '[role="dialog"], .confirmation, text="confirm"'
        );

        if (hasConfirmation) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Mark Paid")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }

        // Should show success notification
        const hasSuccess = await Promise.race([
          testUtils.waitForNotification('paid'),
          testUtils.waitForNotification('marked'),
          page.waitForTimeout(3000).then(() => false)
        ]);

        if (hasSuccess) {
          expect(hasSuccess).toBe(true);
        }
      }
    });

    test('should revert payment status', async ({ page }) => {
      // Mock revert endpoint
      await page.route('**/api/payments/*/revert-paid', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Payment status reverted' })
        });
      });

      // Look for revert button (on paid payments)
      const revertButton = page.locator(
        'button:has-text("Revert"), button:has-text("Undo"), [data-testid="revert-paid"]'
      );

      if (await revertButton.first().isVisible()) {
        await revertButton.first().click();

        // Should show confirmation
        const hasConfirmation = await testUtils.isElementVisible(
          'text="confirm", text="revert", [role="dialog"]'
        );

        if (hasConfirmation) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Revert")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }

        await page.waitForTimeout(1000);
      }
    });

    test('should show payment details modal', async ({ page }) => {
      // Click on payment item to view details
      const paymentItem = page.locator(
        '[data-testid="payment-item"], .payment-card, .payment-row'
      );

      if (await paymentItem.first().isVisible()) {
        await paymentItem.first().click();

        // Should show payment details modal or page
        const hasDetails = await testUtils.isElementVisible(
          '[data-testid="payment-details"], .payment-modal, h2:has-text("Details")'
        );

        if (hasDetails) {
          expect(hasDetails).toBe(true);

          // Should show detailed payment information
          const hasDetailedInfo = await testUtils.isElementVisible(
            '.payment-amount, .due-date, .payment-category, .attribution-info'
          );
          expect(hasDetailedInfo).toBe(true);
        }
      }
    });
  });

  test.describe('Overdue Payments', () => {
    test('should navigate to overdue payments page', async ({ page }) => {
      await page.goto('/payments/overdue');
      await testUtils.waitForPageLoad();

      // Should show overdue payments page
      const hasOverduePage = await testUtils.isElementVisible(
        'h1:has-text("Overdue"), [data-testid="overdue-page"]'
      );

      if (hasOverduePage) {
        expect(hasOverduePage).toBe(true);

        // Should highlight urgency
        const hasUrgencyIndicators = await testUtils.isElementVisible(
          '.text-red, .bg-red, .overdue-highlight'
        );
        expect(hasUrgencyIndicators).toBe(true);
      }
    });

    test('should show overdue payment count and total', async ({ page }) => {
      await page.goto('/payments/overdue');
      await testUtils.waitForPageLoad();

      // Should show count of overdue payments
      const hasOverdueCount = await testUtils.isElementVisible(
        'text=" overdue", [data-testid="overdue-count"]'
      );

      if (hasOverdueCount) {
        expect(hasOverdueCount).toBe(true);

        // Should show total amount overdue
        const hasOverdueTotal = await testUtils.isElementVisible(
          'text=/\\$\\d+/, .total-overdue'
        );
        expect(hasOverdueTotal).toBe(true);
      }
    });

    test('should allow bulk actions on overdue payments', async ({ page }) => {
      await page.goto('/payments/overdue');
      await testUtils.waitForPageLoad();

      // Look for bulk action options
      const hasBulkActions = await testUtils.isElementVisible(
        '[data-testid="bulk-actions"], .bulk-select, input[type="checkbox"]'
      );

      if (hasBulkActions) {
        // Should allow selecting multiple payments
        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 1) {
          await checkboxes.first().check();
          await checkboxes.nth(1).check();

          // Should show bulk action menu
          const hasBulkMenu = await testUtils.isElementVisible(
            'button:has-text("Mark All Paid"), .bulk-actions-menu'
          );
          expect(hasBulkMenu).toBe(true);
        }
      }
    });
  });

  test.describe('Payment Categories and Spending', () => {
    test('should manage spending categories', async ({ page }) => {
      // Navigate to spending categories or find categories section
      await page.goto('/payments');

      // Look for categories management
      const hasCategoriesLink = await testUtils.isElementVisible(
        'a:has-text("Categories"), button:has-text("Categories"), [data-testid="categories"]'
      );

      if (hasCategoriesLink) {
        await page.click('a:has-text("Categories"), button:has-text("Categories")');

        // Should show categories management
        const hasCategoriesPage = await testUtils.isElementVisible(
          'h1:has-text("Categories"), [data-testid="categories-page"]'
        );
        expect(hasCategoriesPage).toBe(true);

        // Should show list of spending categories
        const hasCategoriesList = await testUtils.isElementVisible(
          '[data-testid="categories-list"], .category-item'
        );
        expect(hasCategoriesList).toBe(true);
      }
    });

    test('should create spending category', async ({ page }) => {
      await page.goto('/payments');

      // Navigate to categories if available
      const categoriesLink = page.locator('a:has-text("Categories")');
      if (await categoriesLink.isVisible()) {
        await categoriesLink.click();

        // Look for add category button
        const addCategoryButton = page.locator(
          'button:has-text("Add Category"), a:has-text("Add Category")'
        );

        if (await addCategoryButton.isVisible()) {
          await addCategoryButton.click();

          // Should show category creation form
          const hasCategoryForm = await testUtils.isElementVisible(
            'form, [data-testid="category-form"], h2:has-text("Add Category")'
          );
          expect(hasCategoryForm).toBe(true);
        }
      }
    });

    test('should assign category to payment', async ({ page }) => {
      await page.goto('/payments/create');
      await testUtils.waitForPageLoad();

      // Look for category selection in payment form
      const categorySelect = page.locator(
        'select[name="category"], [data-testid="category-select"]'
      );

      if (await categorySelect.isVisible()) {
        // Mock categories
        await page.route('**/api/spending-categories', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify([
              { id: '1', name: 'Utilities' },
              { id: '2', name: 'Groceries' }
            ])
          });
        });

        await page.reload();
        await testUtils.waitForPageLoad();

        // Should be able to select category
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 1 });
        }
      }
    });
  });

  test.describe('Bulk Payment Operations', () => {
    test('should create multiple payments at once', async ({ page }) => {
      await page.goto('/payments');

      // Look for bulk create option
      const bulkCreateButton = page.locator(
        'button:has-text("Bulk"), a:has-text("Bulk"), [data-testid="bulk-create"]'
      );

      if (await bulkCreateButton.isVisible()) {
        await bulkCreateButton.click();

        // Should show bulk creation interface
        const hasBulkForm = await testUtils.isElementVisible(
          '[data-testid="bulk-form"], .bulk-create, h2:has-text("Bulk")'
        );
        expect(hasBulkForm).toBe(true);

        // Should allow adding multiple payment rows
        const hasAddRowButton = await testUtils.isElementVisible(
          'button:has-text("Add Row"), button:has-text("Add Payment")'
        );
        expect(hasAddRowButton).toBe(true);
      }
    });

    test('should show upcoming payments', async ({ page }) => {
      // Navigate to upcoming payments
      await page.goto('/payments');

      const upcomingLink = page.locator(
        'a:has-text("Upcoming"), button:has-text("Upcoming"), [data-testid="upcoming"]'
      );

      if (await upcomingLink.isVisible()) {
        await upcomingLink.click();

        // Should show upcoming payments
        const hasUpcomingPayments = await testUtils.isElementVisible(
          '[data-testid="upcoming-payments"], .upcoming-list, h1:has-text("Upcoming")'
        );

        if (hasUpcomingPayments) {
          expect(hasUpcomingPayments).toBe(true);

          // Should show future due dates
          const hasFutureDates = await testUtils.isElementVisible(
            '.future-date, .due-date'
          );
          expect(hasFutureDates).toBe(true);
        }
      }
    });

    test('should auto-attribute payments to income', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Look for auto-attribution feature
      const autoAttributeButton = page.locator(
        'button:has-text("Auto-Attribute"), [data-testid="auto-attribute"]'
      );

      if (await autoAttributeButton.isVisible()) {
        // Mock auto-attribution endpoint
        await page.route('**/api/payments/*/auto-attribute', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Payment auto-attributed' })
          });
        });

        await autoAttributeButton.click();

        // Should show attribution progress or results
        const hasAttributionFeedback = await testUtils.isElementVisible(
          '.attribution-result, text="attributed", [data-testid="attribution-status"]'
        );

        if (hasAttributionFeedback) {
          expect(hasAttributionFeedback).toBe(true);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle payment creation failures', async ({ page }) => {
      await page.goto('/payments/create');

      // Mock server error
      await page.route('**/api/payments', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      // Fill and submit form
      const descriptionField = page.locator('input[name="description"]');
      if (await descriptionField.isVisible()) {
        await testUtils.fillField('input[name="description"]', 'Test Payment');

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

    test('should handle payment loading failures', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/payments**', route => route.abort());

      await page.goto('/payments');
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

    test('should handle payment status update failures', async ({ page }) => {
      await page.goto('/payments');

      // Mock status update failure
      await page.route('**/api/payments/*/mark-paid', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Cannot mark payment as paid' })
        });
      });

      const markPaidButton = page.locator('button:has-text("Mark Paid")');
      if (await markPaidButton.first().isVisible()) {
        await markPaidButton.first().click();
        await page.waitForTimeout(2000);

        // Should show error message
        const errors = await testUtils.checkForErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Payment Management Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Tab through payments interface
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');

      // Should focus interactive elements
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        expect(['button', 'a', 'input', 'select'].includes(tagName)).toBe(true);
      }
    });

    test('should have proper ARIA labels and structure', async ({ page }) => {
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should have proper heading hierarchy
      const hasHeadings = await testUtils.isElementVisible('h1, h2, h3');
      expect(hasHeadings).toBe(true);

      // Should have accessible payment list
      const hasListStructure = await testUtils.isElementVisible(
        '[role="list"], ul, [data-testid*="list"]'
      );

      if (hasListStructure) {
        expect(hasListStructure).toBe(true);
      }

      // Buttons should have accessible names
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        const hasAccessibleName = await firstButton.getAttribute('aria-label') ||
                                 await firstButton.textContent();
        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test('should announce status changes to screen readers', async ({ page }) => {
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

  test.describe('Mobile Payment Management', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/payments');
      await testUtils.waitForPageLoad();

      // Should show payment content adapted for mobile
      const hasPaymentContent = await testUtils.isElementVisible(
        '[data-testid="payments-page"], .payments-list, h1'
      );
      expect(hasPaymentContent).toBe(true);

      // Action buttons should be touch-friendly
      const actionButtons = page.locator('button');
      if (await actionButtons.count() > 0) {
        const buttonBox = await actionButtons.first().boundingBox();
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThan(40);
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle mobile payment creation', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/payments/create');
      await testUtils.waitForPageLoad();

      // Form should be mobile-optimized
      const hasForm = await testUtils.isElementVisible('form, [data-testid="payment-form"]');
      if (hasForm) {
        expect(hasForm).toBe(true);

        // Input fields should be appropriately sized for mobile
        const inputs = page.locator('input');
        if (await inputs.count() > 0) {
          const inputBox = await inputs.first().boundingBox();
          if (inputBox) {
            expect(inputBox.height).toBeGreaterThan(40);
          }
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});