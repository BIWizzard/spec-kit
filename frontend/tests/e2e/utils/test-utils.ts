import { Page, expect } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Generate a unique test email address
   */
  generateTestEmail(): string {
    const timestamp = Date.now();
    return `test-${timestamp}@example.com`;
  }

  /**
   * Generate test user data
   */
  generateTestUser() {
    const timestamp = Date.now();
    return {
      email: this.generateTestEmail(),
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      familyName: `Test Family ${timestamp}`
    };
  }

  /**
   * Wait for navigation and loading to complete
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Fill in a form field by label or placeholder
   */
  async fillField(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
    await this.page.waitForTimeout(100); // Small delay for form validation
  }

  /**
   * Click a button and wait for response
   */
  async clickButton(selector: string): Promise<void> {
    await this.page.click(selector);
    await this.page.waitForTimeout(500); // Wait for potential loading states
  }

  /**
   * Check if an element is visible on the page
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return await this.page.isVisible(selector);
    } catch {
      return false;
    }
  }

  /**
   * Wait for a toast or notification message
   */
  async waitForNotification(expectedText?: string): Promise<void> {
    const notificationSelector = '[data-testid="toast"], [role="alert"], .toast, .notification';
    await this.page.waitForSelector(notificationSelector, { timeout: 10000 });

    if (expectedText) {
      await expect(this.page.locator(notificationSelector)).toContainText(expectedText);
    }
  }

  /**
   * Wait for URL to change to expected path
   */
  async waitForUrlChange(expectedPath: string): Promise<void> {
    await this.page.waitForURL(`**${expectedPath}**`, { timeout: 10000 });
  }

  /**
   * Take a screenshot with a custom name
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Clear all form fields in a container
   */
  async clearForm(formSelector: string = 'form'): Promise<void> {
    const inputs = this.page.locator(`${formSelector} input[type="text"], ${formSelector} input[type="email"], ${formSelector} input[type="password"]`);
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      await inputs.nth(i).clear();
    }
  }

  /**
   * Check for error messages on the page
   */
  async checkForErrors(): Promise<string[]> {
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '.error-message',
      '[role="alert"]',
      '.text-red-500',
      '.text-destructive'
    ];

    const errors: string[] = [];

    for (const selector of errorSelectors) {
      const elements = this.page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const text = await elements.nth(i).textContent();
        if (text && text.trim()) {
          errors.push(text.trim());
        }
      }
    }

    return errors;
  }
}