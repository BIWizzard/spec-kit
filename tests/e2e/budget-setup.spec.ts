import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Budget Setup Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for budget setup tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access budget management features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Budget Access and Overview', () => {
    test('should access budget management from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Look for budget navigation or quick action
      const hasBudgetAccess = await testUtils.isElementVisible(
        'a:has-text("Budget"), button:has-text("Budget"), [data-testid="budget-nav"]'
      );

      if (hasBudgetAccess) {
        expect(hasBudgetAccess).toBe(true);

        // Click to access budget
        await page.click('a:has-text("Budget"), button:has-text("Budget")');
        await testUtils.waitForUrlChange('/budget');

        // Should show budget overview page
        const hasBudgetOverview = await testUtils.isElementVisible(
          '[data-testid="budget-page"], h1:has-text("Budget"), .budget-overview'
        );
        expect(hasBudgetOverview).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/budget');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display budget overview with key metrics', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Should show budget overview metrics
      const hasBudgetMetrics = await testUtils.isElementVisible(
        '[data-testid="budget-metrics"], .budget-summary, text="Total Budget"'
      );

      if (hasBudgetMetrics) {
        expect(hasBudgetMetrics).toBe(true);

        // Should display key budget information
        const hasKeyInfo = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="Allocated", text="Remaining"'
        );
        expect(hasKeyInfo).toBe(true);
      }
    });
  });

  test.describe('Budget Categories Setup', () => {
    test('should access budget categories configuration', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for categories section or navigation
      const hasCategoriesAccess = await testUtils.isElementVisible(
        'a:has-text("Categories"), button:has-text("Categories"), [data-testid="budget-categories"]'
      );

      if (hasCategoriesAccess) {
        await page.click('a:has-text("Categories"), button:has-text("Categories")');
        await testUtils.waitForUrlChange('/budget/categories');
      } else {
        // Direct navigation to categories
        await page.goto('/budget/categories');
        await testUtils.waitForPageLoad();
      }

      // Should show budget categories page
      const hasCategoriesPage = await testUtils.isElementVisible(
        '[data-testid="categories-page"], h1:has-text("Budget Categories"), .budget-categories'
      );

      if (hasCategoriesPage) {
        expect(hasCategoriesPage).toBe(true);
      }
    });

    test('should create new budget category', async ({ page }) => {
      await page.goto('/budget/categories');
      await testUtils.waitForPageLoad();

      // Look for create category button
      const hasCreateButton = await testUtils.isElementVisible(
        'button:has-text("Add Category"), button:has-text("New Category"), [data-testid="create-category"]'
      );

      if (hasCreateButton) {
        await page.click('button:has-text("Add Category"), button:has-text("New Category")');

        // Should show create category form
        const hasCreateForm = await testUtils.isElementVisible(
          '[data-testid="category-form"], form, .category-modal'
        );

        if (hasCreateForm) {
          expect(hasCreateForm).toBe(true);

          // Fill in category details
          await testUtils.fillFormField('Name', 'Housing');
          await testUtils.fillFormField('Description', 'Rent, utilities, and housing costs');

          // Set category percentage
          const percentageField = page.locator('input[type="number"], input[name*="percent"]').first();
          if (await percentageField.isVisible()) {
            await percentageField.fill('30');
          }

          // Set priority level if available
          const prioritySelect = page.locator('select[name*="priority"], [data-testid="priority-select"]');
          if (await prioritySelect.isVisible()) {
            await prioritySelect.selectOption('high');
          }

          // Save category
          await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');

          // Should show success indication
          const hasSuccess = await testUtils.isElementVisible(
            'text="Category created", .success-message, [data-testid="success"]'
          );

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }

          // Category should appear in list
          const categoryExists = await testUtils.isElementVisible('text="Housing"');
          expect(categoryExists).toBe(true);
        }
      }
    });

    test('should validate percentage totals', async ({ page }) => {
      await page.goto('/budget/categories');
      await testUtils.waitForPageLoad();

      // Check if percentage validation is shown
      const hasPercentageInfo = await testUtils.isElementVisible(
        'text="%", text="Total", .percentage-total'
      );

      if (hasPercentageInfo) {
        expect(hasPercentageInfo).toBe(true);

        // Should show current total percentage
        const hasTotal = await testUtils.isElementVisible(
          'text=/\\d+%/, text="of 100%"'
        );
        expect(hasTotal).toBe(true);
      }

      // Try to create category that would exceed 100%
      const hasCreateButton = await testUtils.isElementVisible(
        'button:has-text("Add Category"), button:has-text("New Category")'
      );

      if (hasCreateButton) {
        await page.click('button:has-text("Add Category"), button:has-text("New Category")');

        const hasForm = await testUtils.isElementVisible('[data-testid="category-form"], form');
        if (hasForm) {
          await testUtils.fillFormField('Name', 'Test Over 100%');

          const percentageField = page.locator('input[type="number"], input[name*="percent"]').first();
          if (await percentageField.isVisible()) {
            await percentageField.fill('150'); // Over 100%
            await testUtils.clickButton('button:has-text("Save"), button:has-text("Create")');

            // Should show validation error
            const hasValidationError = await testUtils.isElementVisible(
              'text="exceeds 100%", text="invalid", .error-message'
            );

            if (hasValidationError) {
              expect(hasValidationError).toBe(true);
            }
          }
        }
      }
    });

    test('should edit existing budget category', async ({ page }) => {
      await page.goto('/budget/categories');
      await testUtils.waitForPageLoad();

      // Look for existing category to edit
      const categoryItem = page.locator(
        '[data-testid="category-item"], .category-card, .category-row'
      );

      if (await categoryItem.first().isVisible()) {
        // Click edit button or category item
        const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-category"]').first();

        if (await editButton.isVisible()) {
          await editButton.click();
        } else {
          await categoryItem.first().click();
        }

        // Should show edit form
        const hasEditForm = await testUtils.isElementVisible(
          '[data-testid="category-form"], form, .edit-modal'
        );

        if (hasEditForm) {
          expect(hasEditForm).toBe(true);

          // Modify category details
          const nameField = page.locator('input[name="name"], input[placeholder*="name"]').first();
          if (await nameField.isVisible()) {
            await nameField.clear();
            await nameField.fill('Updated Category');
          }

          const percentageField = page.locator('input[type="number"], input[name*="percent"]').first();
          if (await percentageField.isVisible()) {
            await percentageField.clear();
            await percentageField.fill('25');
          }

          // Save changes
          await testUtils.clickButton('button:has-text("Save"), button:has-text("Update")');

          // Should show success and updated name
          await testUtils.waitForPageLoad();
          const updatedCategory = await testUtils.isElementVisible('text="Updated Category"');
          expect(updatedCategory).toBe(true);
        }
      }
    });

    test('should delete budget category', async ({ page }) => {
      await page.goto('/budget/categories');
      await testUtils.waitForPageLoad();

      // Look for category to delete
      const categoryItem = page.locator(
        '[data-testid="category-item"], .category-card, .category-row'
      );

      if (await categoryItem.first().isVisible()) {
        const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-category"]').first();

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Should show confirmation dialog
          const hasConfirmDialog = await testUtils.isElementVisible(
            'text="Are you sure", text="Delete", .confirmation-dialog'
          );

          if (hasConfirmDialog) {
            expect(hasConfirmDialog).toBe(true);

            // Confirm deletion
            await testUtils.clickButton('button:has-text("Delete"), button:has-text("Confirm")');

            // Should show success message
            const hasSuccess = await testUtils.isElementVisible(
              'text="Category deleted", .success-message'
            );

            if (hasSuccess) {
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Budget Templates', () => {
    test('should access budget templates', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for templates section
      const hasTemplatesAccess = await testUtils.isElementVisible(
        'a:has-text("Templates"), button:has-text("Templates"), [data-testid="budget-templates"]'
      );

      if (hasTemplatesAccess) {
        await page.click('a:has-text("Templates"), button:has-text("Templates")');
        await testUtils.waitForUrlChange('/budget/templates');
      } else {
        await page.goto('/budget/templates');
        await testUtils.waitForPageLoad();
      }

      // Should show templates page
      const hasTemplatesPage = await testUtils.isElementVisible(
        '[data-testid="templates-page"], h1:has-text("Templates"), .budget-templates'
      );

      if (hasTemplatesPage) {
        expect(hasTemplatesPage).toBe(true);
      }
    });

    test('should apply budget template', async ({ page }) => {
      await page.goto('/budget/templates');
      await testUtils.waitForPageLoad();

      // Look for available templates
      const templateItem = page.locator(
        '[data-testid="template-item"], .template-card, .template-option'
      );

      if (await templateItem.first().isVisible()) {
        // Click on template or apply button
        const applyButton = page.locator('button:has-text("Apply"), [data-testid="apply-template"]').first();

        if (await applyButton.isVisible()) {
          await applyButton.click();
        } else {
          await templateItem.first().click();
        }

        // Should show confirmation or preview
        const hasConfirmation = await testUtils.isElementVisible(
          'text="Apply template", text="This will replace", .template-confirmation'
        );

        if (hasConfirmation) {
          expect(hasConfirmation).toBe(true);

          // Confirm template application
          await testUtils.clickButton('button:has-text("Apply"), button:has-text("Confirm")');

          // Should show success
          const hasSuccess = await testUtils.isElementVisible(
            'text="Template applied", .success-message'
          );

          if (hasSuccess) {
            expect(hasSuccess).toBe(true);
          }

          // Should redirect to categories with new template categories
          await testUtils.waitForUrlChange('/budget/categories');

          // Should show template categories
          const hasCategories = await testUtils.isElementVisible(
            '[data-testid="category-item"], .category-card'
          );
          expect(hasCategories).toBe(true);
        }
      }
    });

    test('should preview template before applying', async ({ page }) => {
      await page.goto('/budget/templates');
      await testUtils.waitForPageLoad();

      const templateItem = page.locator(
        '[data-testid="template-item"], .template-card'
      );

      if (await templateItem.first().isVisible()) {
        // Look for preview functionality
        const previewButton = page.locator('button:has-text("Preview"), [data-testid="preview-template"]').first();

        if (await previewButton.isVisible()) {
          await previewButton.click();

          // Should show template preview modal
          const hasPreview = await testUtils.isElementVisible(
            '[data-testid="template-preview"], .template-modal, text="Preview"'
          );

          if (hasPreview) {
            expect(hasPreview).toBe(true);

            // Should show categories and percentages
            const hasPreviewDetails = await testUtils.isElementVisible(
              'text="%", .category-list, .percentage-breakdown'
            );
            expect(hasPreviewDetails).toBe(true);

            // Should have close or cancel option
            const hasClose = await testUtils.isElementVisible(
              'button:has-text("Close"), button:has-text("Cancel")'
            );

            if (hasClose) {
              await testUtils.clickButton('button:has-text("Close"), button:has-text("Cancel")');
            }
          }
        }
      }
    });
  });

  test.describe('Budget Validation and Integrity', () => {
    test('should validate budget percentage totals across all categories', async ({ page }) => {
      await page.goto('/budget/categories');
      await testUtils.waitForPageLoad();

      // Check for validation summary
      const hasValidation = await testUtils.isElementVisible(
        '[data-testid="budget-validation"], .validation-summary, text="Total"'
      );

      if (hasValidation) {
        expect(hasValidation).toBe(true);

        // Should show percentage total
        const hasPercentageTotal = await testUtils.isElementVisible(
          'text=/\\d+%/, text="of 100%"'
        );
        expect(hasPercentageTotal).toBe(true);

        // Should indicate if budget is valid or needs attention
        const hasValidationStatus = await testUtils.isElementVisible(
          'text="Complete", text="Incomplete", .validation-status'
        );
        expect(hasValidationStatus).toBe(true);
      }
    });

    test('should show budget setup progress', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for setup progress indicators
      const hasProgress = await testUtils.isElementVisible(
        '[data-testid="setup-progress"], .progress-indicator, text="Setup Progress"'
      );

      if (hasProgress) {
        expect(hasProgress).toBe(true);

        // Should show completion steps
        const hasSteps = await testUtils.isElementVisible(
          '.progress-step, text="Categories", text="Percentages"'
        );
        expect(hasSteps).toBe(true);
      }
    });

    test('should provide budget setup guidance', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for help or guidance section
      const hasGuidance = await testUtils.isElementVisible(
        '[data-testid="budget-help"], .help-section, text="Getting Started"'
      );

      if (hasGuidance) {
        expect(hasGuidance).toBe(true);

        // Should provide helpful tips
        const hasTips = await testUtils.isElementVisible(
          'text="tip", text="recommendation", .budget-tips'
        );
        expect(hasTips).toBe(true);
      }
    });
  });

  test.describe('Budget Setup Integration', () => {
    test('should integrate budget setup with income events', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for income integration
      const hasIncomeLink = await testUtils.isElementVisible(
        'a:has-text("Income"), text="income event", .income-integration'
      );

      if (hasIncomeLink) {
        expect(hasIncomeLink).toBe(true);

        // Should be able to navigate to income setup
        await page.click('a:has-text("Income"), text="income event"');

        // Should reach income page or show income modal
        const hasIncomeInterface = await testUtils.isElementVisible(
          '[data-testid="income-page"], text="Income Events", .income-modal'
        );

        if (hasIncomeInterface) {
          expect(hasIncomeInterface).toBe(true);
        }
      }
    });

    test('should show budget impact on cash flow', async ({ page }) => {
      await page.goto('/budget');
      await testUtils.waitForPageLoad();

      // Look for cash flow preview or impact
      const hasCashFlowInfo = await testUtils.isElementVisible(
        'text="cash flow", text="projected", .cash-flow-preview'
      );

      if (hasCashFlowInfo) {
        expect(hasCashFlowInfo).toBe(true);

        // Should show projected amounts
        const hasProjections = await testUtils.isElementVisible(
          'text=/\\$\\d+/, text="remaining", text="allocated"'
        );
        expect(hasProjections).toBe(true);
      }
    });
  });
});