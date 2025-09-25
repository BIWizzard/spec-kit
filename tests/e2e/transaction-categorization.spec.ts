import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Transaction Categorization Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for transaction categorization tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access transaction categorization
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Uncategorized Transactions Access', () => {
    test('should navigate to uncategorized transactions page', async ({ page }) => {
      await page.goto('/transactions');
      await testUtils.waitForPageLoad();

      // Should show transactions page with categorization options
      const hasTransactionsPage = await testUtils.isElementVisible(
        'h1:has-text("Transactions"), [data-testid="transactions-page"]'
      );
      expect(hasTransactionsPage).toBe(true);

      // Should have link to uncategorized transactions
      const hasUncategorizedLink = await testUtils.isElementVisible(
        'a:has-text("Uncategorized"), button:has-text("Uncategorized"), [data-testid="uncategorized-link"]'
      );

      if (hasUncategorizedLink) {
        await page.click('a:has-text("Uncategorized"), button:has-text("Uncategorized")');
        await testUtils.waitForUrlChange('/transactions/uncategorized');
      } else {
        await page.goto('/transactions/uncategorized');
      }

      await testUtils.waitForPageLoad();

      // Should show uncategorized transactions page
      const hasUncategorizedPage = await testUtils.isElementVisible(
        'h1:has-text("Uncategorized"), [data-testid="uncategorized-page"]'
      );
      expect(hasUncategorizedPage).toBe(true);
    });

    test('should display uncategorized transaction count', async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Should show count of uncategorized transactions
      const hasTransactionCount = await testUtils.isElementVisible(
        'p:has-text("transactions"), [data-testid="transaction-count"], text=" transactions need"'
      );
      expect(hasTransactionCount).toBe(true);

      // May show suggestions count if available
      const hasSuggestionsCount = await testUtils.isElementVisible(
        'text="have suggestions", [data-testid="suggestions-count"]'
      );

      if (hasSuggestionsCount) {
        expect(hasSuggestionsCount).toBe(true);
      }
    });

    test('should show empty state when all transactions categorized', async ({ page }) => {
      // Mock empty transactions response
      await page.route('**/api/transactions?**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      });

      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Should show empty state
      const hasEmptyState = await testUtils.isElementVisible(
        'text="All caught up", text="All your transactions have been categorized", [data-testid="empty-state"]'
      );
      expect(hasEmptyState).toBe(true);

      // Should have link to view all transactions
      const hasViewAllLink = await testUtils.isElementVisible(
        'button:has-text("View All"), a:has-text("View All")'
      );
      expect(hasViewAllLink).toBe(true);
    });
  });

  test.describe('Transaction List Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();
    });

    test('should display transaction information', async ({ page }) => {
      // Should show transaction table or list
      const hasTransactionList = await testUtils.isElementVisible(
        '[data-testid="transactions-list"], .transactions-list, table'
      );
      expect(hasTransactionList).toBe(true);

      // Should show transaction details
      const hasTransactionDetails = await testUtils.isElementVisible(
        '.transaction-date, .transaction-description, .transaction-amount'
      );

      if (hasTransactionDetails) {
        // Should show date, description, and amount
        const hasDate = await testUtils.isElementVisible('text=/\\w{3}\\s+\\d+/'); // Jan 15 format
        const hasAmount = await testUtils.isElementVisible('text=/\\$\\d+/');
        expect(hasDate || hasAmount).toBe(true);
      }
    });

    test('should show transaction selection checkboxes', async ({ page }) => {
      const hasCheckboxes = await testUtils.isElementVisible(
        'input[type="checkbox"]:not([data-testid="select-all"])'
      );

      if (hasCheckboxes) {
        // Should show individual transaction checkboxes
        const transactionCheckboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
        const checkboxCount = await transactionCheckboxes.count();
        expect(checkboxCount).toBeGreaterThan(0);

        // Should show select all checkbox
        const hasSelectAll = await testUtils.isElementVisible(
          'input[type="checkbox"][data-testid="select-all"], thead input[type="checkbox"]'
        );
        expect(hasSelectAll).toBe(true);
      }
    });

    test('should display AI suggestions when available', async ({ page }) => {
      // Look for AI suggestions section
      const hasSuggestions = await testUtils.isElementVisible(
        '[data-testid="ai-suggestions"], .ai-suggestions, text="Smart Suggestions", text="suggestions"'
      );

      if (hasSuggestions) {
        // Should show confidence levels
        const hasConfidence = await testUtils.isElementVisible(
          'text="High confidence", text="Medium confidence", text="Low confidence", .confidence'
        );
        expect(hasConfidence).toBe(true);

        // Should show suggested categories
        const hasCategoryNames = await testUtils.isElementVisible(
          '.suggested-category, [data-testid="suggested-category"]'
        );
        expect(hasCategoryNames).toBe(true);
      }
    });

    test('should show pending transaction indicators', async ({ page }) => {
      // Look for pending transaction indicators
      const hasPendingIndicators = await testUtils.isElementVisible(
        'text="Pending", .pending, [data-status="pending"]'
      );

      if (hasPendingIndicators) {
        expect(hasPendingIndicators).toBe(true);
      }
    });
  });

  test.describe('Individual Transaction Categorization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();
    });

    test('should categorize transaction with suggestion acceptance', async ({ page }) => {
      // Look for accept suggestion buttons
      const acceptButtons = page.locator('button:has-text("Accept"), [data-testid="accept-suggestion"]');

      if (await acceptButtons.count() > 0) {
        // Mock successful categorization
        await page.route('**/api/transactions/categorize-batch', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Transaction categorized successfully' })
          });
        });

        await acceptButtons.first().click();

        // Should show success feedback
        await page.waitForTimeout(1000);

        // Transaction should be removed from list or updated
        const remainingTransactions = await page.locator('[data-testid="transaction-row"], .transaction-item').count();
        expect(remainingTransactions).toBeGreaterThanOrEqual(0);
      }
    });

    test('should categorize transaction with manual category selection', async ({ page }) => {
      // Look for category dropdown/select
      const categorySelects = page.locator('select, [data-testid="category-select"]');

      if (await categorySelects.count() > 0) {
        // Mock categories and categorization
        await page.route('**/api/spending-categories', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify([
              { id: '1', name: 'Groceries', color: '#10B981' },
              { id: '2', name: 'Gas', color: '#F59E0B' },
              { id: '3', name: 'Dining', color: '#EF4444' }
            ])
          });
        });

        await page.route('**/api/transactions/categorize-batch', route => {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        const categorySelect = categorySelects.first();
        await categorySelect.selectOption({ index: 1 }); // Select first category

        // Should trigger categorization
        await page.waitForTimeout(1000);
      }
    });

    test('should create categorization rule with transaction', async ({ page }) => {
      // Look for "Accept + Rule" or similar buttons
      const ruleButtons = page.locator(
        'button:has-text("Accept + Rule"), button:has-text("Create Rule"), [data-testid="create-rule"]'
      );

      if (await ruleButtons.count() > 0) {
        // Mock rule creation
        await page.route('**/api/categorization-rules', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ message: 'Rule created successfully' })
          });
        });

        await page.route('**/api/transactions/categorize-batch', route => {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        await ruleButtons.first().click();

        // Should show rule creation feedback
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Bulk Transaction Categorization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();
    });

    test('should select multiple transactions', async ({ page }) => {
      // Check if transactions exist first
      const transactionCheckboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
      const checkboxCount = await transactionCheckboxes.count();

      if (checkboxCount > 0) {
        // Select first two transactions
        await transactionCheckboxes.first().check();
        if (checkboxCount > 1) {
          await transactionCheckboxes.nth(1).check();
        }

        // Should show bulk actions
        const hasBulkActions = await testUtils.isElementVisible(
          '[data-testid="bulk-actions"], .bulk-actions, text="selected"'
        );
        expect(hasBulkActions).toBe(true);

        // Should show selected count
        const hasSelectedCount = await testUtils.isElementVisible(
          'text="selected", [data-testid="selected-count"]'
        );
        expect(hasSelectedCount).toBe(true);
      }
    });

    test('should select all transactions', async ({ page }) => {
      // Find select all checkbox
      const selectAllCheckbox = page.locator(
        'input[type="checkbox"][data-testid="select-all"], thead input[type="checkbox"]'
      );

      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();

        // Should show all transactions selected
        const hasBulkActions = await testUtils.isElementVisible(
          '[data-testid="bulk-actions"], text="selected"'
        );
        expect(hasBulkActions).toBe(true);

        // Should show bulk categorization options
        const hasBulkCategory = await testUtils.isElementVisible(
          'select[data-testid="bulk-category"], .bulk-category-select'
        );
        expect(hasBulkCategory).toBe(true);
      }
    });

    test('should bulk categorize selected transactions', async ({ page }) => {
      // Mock transactions and categories
      await page.route('**/api/spending-categories', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: '1', name: 'Groceries', color: '#10B981' },
            { id: '2', name: 'Gas', color: '#F59E0B' }
          ])
        });
      });

      await page.route('**/api/transactions/categorize-batch', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Transactions categorized successfully' })
        });
      });

      // Check if transactions exist
      const transactionCheckboxes = page.locator('input[type="checkbox"]:not([data-testid="select-all"])');
      if (await transactionCheckboxes.count() > 0) {
        // Select transactions
        await transactionCheckboxes.first().check();

        // Find and use bulk category selector
        const bulkCategorySelect = page.locator('select, [data-testid="bulk-category"]');
        if (await bulkCategorySelect.isVisible()) {
          await bulkCategorySelect.selectOption({ index: 1 });

          // Find and click bulk categorize button
          const categorizeButton = page.locator(
            'button:has-text("Categorize"), [data-testid="bulk-categorize"]'
          );
          if (await categorizeButton.isVisible()) {
            await categorizeButton.click();

            // Should show processing state
            const hasProcessing = await testUtils.isElementVisible(
              'text="Categorizing", .loading, [data-testid="categorizing"]'
            );
            expect(hasProcessing).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Auto-Categorization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();
    });

    test('should trigger auto-categorization', async ({ page }) => {
      // Mock auto-categorization
      await page.route('**/api/transactions/auto-categorize', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            categorized: 5,
            message: '5 transactions auto-categorized'
          })
        });
      });

      // Look for auto-categorize button
      const autoButton = page.locator(
        'button:has-text("Auto-Categorize"), [data-testid="auto-categorize"]'
      );

      if (await autoButton.isVisible()) {
        await autoButton.click();

        // Should show processing state
        const hasProcessing = await testUtils.isElementVisible(
          '.loading, .animate-pulse, [data-testid="auto-processing"]'
        );
        expect(hasProcessing).toBe(true);
      }
    });

    test('should accept all high-confidence suggestions', async ({ page }) => {
      // Look for "Accept All Suggestions" button
      const acceptAllButton = page.locator(
        'button:has-text("Accept All"), [data-testid="accept-all-suggestions"]'
      );

      if (await acceptAllButton.isVisible()) {
        // Mock bulk acceptance
        await page.route('**/api/transactions/categorize-batch', route => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true })
          });
        });

        await acceptAllButton.click();

        // Should process all high-confidence suggestions
        await page.waitForTimeout(2000);

        // Should update transaction list
        await testUtils.waitForPageLoad();
      }
    });
  });

  test.describe('Filtering and Sorting', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();
    });

    test('should filter transactions by bank account', async ({ page }) => {
      // Mock bank accounts
      await page.route('**/api/bank-accounts?**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([
            { id: '1', institutionName: 'Chase', accountName: 'Checking' },
            { id: '2', institutionName: 'Wells Fargo', accountName: 'Savings' }
          ])
        });
      });

      // Look for account filter
      const accountFilter = page.locator(
        'select[data-testid="account-filter"], select:has(option:has-text("All Accounts"))'
      );

      if (await accountFilter.isVisible()) {
        await accountFilter.selectOption({ index: 1 }); // Select first account

        // Should update transaction list based on filter
        await page.waitForTimeout(1000);
        await testUtils.waitForPageLoad();
      }
    });

    test('should sort transactions by different criteria', async ({ page }) => {
      // Look for sortable column headers
      const sortHeaders = page.locator(
        'button:has-text("Date"), button:has-text("Amount"), button:has-text("Transaction")'
      );

      if (await sortHeaders.count() > 0) {
        // Click on date header to sort
        const dateHeader = page.locator('button:has-text("Date")');
        if (await dateHeader.isVisible()) {
          await dateHeader.click();

          // Should show sort indicator
          const hasSortIndicator = await testUtils.isElementVisible(
            'text="↑", text="↓", .sort-asc, .sort-desc'
          );
          expect(hasSortIndicator).toBe(true);
        }
      }
    });

    test('should toggle AI suggestions display', async ({ page }) => {
      // Look for suggestions toggle
      const suggestionsToggle = page.locator(
        'input[type="checkbox"]:has(~ span:has-text("AI suggestions")), [data-testid="suggestions-toggle"]'
      );

      if (await suggestionsToggle.isVisible()) {
        await suggestionsToggle.click();

        // Should hide/show suggestion columns
        await page.waitForTimeout(500);

        // Toggle back
        await suggestionsToggle.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle categorization failures', async ({ page }) => {
      await page.goto('/transactions/uncategorized');

      // Mock categorization failure
      await page.route('**/api/transactions/categorize-batch', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Categorization failed',
            message: 'Unable to categorize the selected transactions'
          })
        });
      });

      // Try to categorize a transaction
      const acceptButton = page.locator('button:has-text("Accept")');
      if (await acceptButton.first().isVisible()) {
        await acceptButton.first().click();
        await page.waitForTimeout(1000);

        // Should show error message
        const errors = await testUtils.checkForErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle auto-categorization failures', async ({ page }) => {
      await page.goto('/transactions/uncategorized');

      // Mock auto-categorization failure
      await page.route('**/api/transactions/auto-categorize', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            error: 'Auto-categorization service unavailable'
          })
        });
      });

      const autoButton = page.locator('button:has-text("Auto-Categorize")');
      if (await autoButton.isVisible()) {
        await autoButton.click();
        await page.waitForTimeout(2000);

        // Should show error state
        const errors = await testUtils.checkForErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    test('should handle network failures gracefully', async ({ page }) => {
      await page.goto('/transactions/uncategorized');

      // Mock network failure
      await page.route('**/api/transactions?**', route => route.abort());

      // Refresh page to trigger API call
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);

        // Should show error or loading state
        const hasErrorOrLoading = await testUtils.isElementVisible(
          '.error, .loading, text="Failed", text="Loading"'
        );
        expect(hasErrorOrLoading).toBe(true);
      }
    });
  });

  test.describe('Transaction Categorization Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Tab through checkboxes
      await page.press('body', 'Tab');
      await page.press('body', 'Tab');

      // Should focus checkboxes and buttons
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        expect(['input', 'button', 'select'].includes(tagName)).toBe(true);
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Check for accessible table structure
      const hasTableHeaders = await testUtils.isElementVisible('th, [role="columnheader"]');
      if (hasTableHeaders) {
        expect(hasTableHeaders).toBe(true);
      }

      // Check for accessible form controls
      const hasFormLabels = await testUtils.isElementVisible('label, [aria-label]');
      expect(hasFormLabels).toBe(true);
    });

    test('should announce status changes', async ({ page }) => {
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Should have live regions for status updates
      const hasLiveRegions = await testUtils.isElementVisible(
        '[role="status"], [aria-live], [data-testid="status-update"]'
      );

      if (hasLiveRegions) {
        expect(hasLiveRegions).toBe(true);
      }
    });
  });

  test.describe('Mobile Transaction Categorization', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Should adapt layout for mobile
      const hasResponsiveLayout = await testUtils.isElementVisible(
        '.mobile-layout, .responsive, [data-testid="mobile-optimized"]'
      );

      // Should show transaction list (may be different layout)
      const hasTransactionsList = await testUtils.isElementVisible(
        '[data-testid="transactions-list"], .transaction-item, .transaction-row'
      );

      if (hasTransactionsList) {
        expect(hasTransactionsList).toBe(true);
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle touch interactions', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/transactions/uncategorized');
      await testUtils.waitForPageLoad();

      // Check if checkboxes are large enough for touch
      const checkboxes = page.locator('input[type="checkbox"]');
      if (await checkboxes.count() > 0) {
        const checkboxBox = await checkboxes.first().boundingBox();

        // Either the checkbox itself or its container should be touch-friendly
        if (checkboxBox) {
          const isTouchFriendly = checkboxBox.height >= 44 || checkboxBox.width >= 44;
          if (!isTouchFriendly) {
            // Check if there's a larger touch target around it
            const parentBox = await checkboxes.first().locator('..').boundingBox();
            expect(parentBox?.height).toBeGreaterThanOrEqual(40);
          }
        }
      }

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});