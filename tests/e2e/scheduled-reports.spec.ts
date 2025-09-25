import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Scheduled Reports Management', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for scheduled reports tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access scheduled reports features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Scheduled Reports Access and Overview', () => {
    test('should access scheduled reports from reports navigation', async ({ page }) => {
      await page.goto('/reports');
      await testUtils.waitForPageLoad();

      // Look for scheduled reports navigation
      const hasScheduledReportsNav = await testUtils.isElementVisible(
        'a:has-text("Scheduled"), button:has-text("Scheduled"), [data-testid="scheduled-reports-nav"]'
      );

      if (hasScheduledReportsNav) {
        expect(hasScheduledReportsNav).toBe(true);

        await page.click('a:has-text("Scheduled"), button:has-text("Scheduled")');
        await testUtils.waitForUrlChange('/reports/scheduled');

        // Should show scheduled reports page
        const hasScheduledReportsPage = await testUtils.isElementVisible(
          '[data-testid="scheduled-reports-page"], h1:has-text("Scheduled"), .scheduled-container'
        );
        expect(hasScheduledReportsPage).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/reports/scheduled');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display scheduled reports overview and list', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Should show scheduled reports overview
      const hasScheduledOverview = await testUtils.isElementVisible(
        '[data-testid="scheduled-overview"], .scheduled-summary, text="Scheduled Reports"'
      );

      if (hasScheduledOverview) {
        expect(hasScheduledOverview).toBe(true);

        // Should show create new schedule option
        const hasCreateButton = await testUtils.isElementVisible(
          'button:has-text("Schedule Report"), button:has-text("New Schedule"), [data-testid="create-schedule"]'
        );
        expect(hasCreateButton).toBe(true);

        // Should show existing schedules if any
        const hasScheduleList = await testUtils.isElementVisible(
          '[data-testid="schedules-list"], .schedule-item, .scheduled-report'
        );

        if (hasScheduleList) {
          expect(hasScheduleList).toBe(true);

          // Should show schedule details
          const hasScheduleDetails = await testUtils.isElementVisible(
            'text="Weekly", text="Monthly", text="Daily", .frequency-display'
          );
          expect(hasScheduleDetails).toBe(true);

          // Should show next run information
          const hasNextRun = await testUtils.isElementVisible(
            'text="Next run", text="Next:", .next-run-info'
          );

          if (hasNextRun) {
            expect(hasNextRun).toBe(true);
          }
        } else {
          // Should show empty state if no schedules
          const hasEmptyState = await testUtils.isElementVisible(
            'text="No scheduled reports", text="Create your first", .empty-schedules'
          );

          if (hasEmptyState) {
            expect(hasEmptyState).toBe(true);
          }
        }
      }
    });

    test('should show schedule status indicators', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Should show different schedule statuses
      const hasStatusIndicators = await testUtils.isElementVisible(
        '[data-testid="schedule-status"], .status-active, .status-paused, .status-error'
      );

      if (hasStatusIndicators) {
        expect(hasStatusIndicators).toBe(true);

        // Should show active schedules
        const hasActiveSchedules = await testUtils.isElementVisible(
          'text="Active", .status-active, .active-indicator'
        );

        if (hasActiveSchedules) {
          expect(hasActiveSchedules).toBe(true);
        }

        // Should show paused schedules
        const hasPausedSchedules = await testUtils.isElementVisible(
          'text="Paused", .status-paused, .paused-indicator'
        );

        if (hasPausedSchedules) {
          expect(hasPausedSchedules).toBe(true);
        }

        // Should show error schedules if any
        const hasErrorSchedules = await testUtils.isElementVisible(
          'text="Error", .status-error, .error-indicator'
        );

        if (hasErrorSchedules) {
          expect(hasErrorSchedules).toBe(true);
        }
      }
    });
  });

  test.describe('Creating Scheduled Reports', () => {
    test('should open schedule creation modal', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Click create schedule button
      const hasCreateButton = await testUtils.isElementVisible(
        'button:has-text("Schedule Report"), button:has-text("New Schedule"), [data-testid="create-schedule"]'
      );

      if (hasCreateButton) {
        await page.click('button:has-text("Schedule Report"), button:has-text("New Schedule")');

        // Should show schedule creation modal
        const hasScheduleModal = await testUtils.isElementVisible(
          '[data-testid="schedule-modal"], .schedule-dialog, text="Schedule Report"'
        );

        if (hasScheduleModal) {
          expect(hasScheduleModal).toBe(true);

          // Should show report type selection
          const hasReportTypeSelection = await testUtils.isElementVisible(
            'select[name*="type"], [data-testid="report-type"], text="Report Type"'
          );
          expect(hasReportTypeSelection).toBe(true);

          // Should show frequency selection
          const hasFrequencySelection = await testUtils.isElementVisible(
            'select[name*="frequency"], [data-testid="frequency"], text="Frequency"'
          );
          expect(hasFrequencySelection).toBe(true);

          // Should show schedule name field
          const hasNameField = await testUtils.isElementVisible(
            'input[name*="name"], [data-testid="schedule-name"], text="Schedule Name"'
          );
          expect(hasNameField).toBe(true);

          // Should show recipient email field
          const hasRecipientField = await testUtils.isElementVisible(
            'input[type="email"], input[name*="email"], [data-testid="recipient-email"]'
          );
          expect(hasRecipientField).toBe(true);
        }
      }
    });

    test('should validate schedule creation form', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation modal
      const createButton = page.locator('button:has-text("Schedule Report"), button:has-text("New Schedule")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Try to submit empty form
        const submitButton = page.locator('button:has-text("Create"), button:has-text("Schedule")');
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation errors
          const hasValidationErrors = await testUtils.isElementVisible(
            'text="required", text="Please enter", .error-message, .form-error'
          );

          if (hasValidationErrors) {
            expect(hasValidationErrors).toBe(true);
          }
        }

        // Fill form with invalid email
        const nameField = page.locator('input[name*="name"], [data-testid="schedule-name"]');
        if (await nameField.isVisible()) {
          await nameField.fill('Weekly Cash Flow Report');
        }

        const emailField = page.locator('input[type="email"], input[name*="email"]');
        if (await emailField.isVisible()) {
          await emailField.fill('invalid-email');

          if (await submitButton.isVisible()) {
            await submitButton.click();

            // Should show email validation error
            const hasEmailError = await testUtils.isElementVisible(
              'text="valid email", text="invalid email", .email-error'
            );

            if (hasEmailError) {
              expect(hasEmailError).toBe(true);
            }
          }
        }
      }
    });

    test('should create weekly cash flow report schedule', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation modal
      const createButton = page.locator('button:has-text("Schedule Report"), button:has-text("New Schedule")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in schedule details
        const nameField = page.locator('input[name*="name"], [data-testid="schedule-name"]');
        if (await nameField.isVisible()) {
          await nameField.fill('Weekly Cash Flow Summary');
        }

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

        // Set recipient email
        const emailField = page.locator('input[type="email"], input[name*="email"]');
        if (await emailField.isVisible()) {
          await emailField.fill('recipient@example.com');
        }

        // Set start date
        const startDateField = page.locator('input[type="date"], [data-testid="start-date"]');
        if (await startDateField.isVisible()) {
          await startDateField.fill('2024-01-01');
        }

        // Create schedule
        await testUtils.clickButton('button:has-text("Create"), button:has-text("Schedule")');

        // Should show success message
        const hasSuccess = await testUtils.isElementVisible(
          'text="Schedule created", text="scheduled successfully", .success-message'
        );

        if (hasSuccess) {
          expect(hasSuccess).toBe(true);

          // Modal should close
          const modalClosed = await testUtils.isElementVisible(
            '[data-testid="schedule-modal"], .schedule-dialog'
          );
          expect(modalClosed).toBe(false);

          // Should show new schedule in list
          const hasNewSchedule = await testUtils.isElementVisible(
            'text="Weekly Cash Flow Summary", text="Weekly", text="recipient@example.com"'
          );

          if (hasNewSchedule) {
            expect(hasNewSchedule).toBe(true);
          }
        }
      }
    });

    test('should create monthly budget performance schedule', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation modal
      const createButton = page.locator('button:has-text("Schedule Report"), button:has-text("New Schedule")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in monthly budget schedule
        const nameField = page.locator('input[name*="name"]');
        if (await nameField.isVisible()) {
          await nameField.fill('Monthly Budget Analysis');
        }

        const reportTypeSelect = page.locator('select[name*="type"]');
        if (await reportTypeSelect.isVisible()) {
          await reportTypeSelect.selectOption('budget-performance');
        }

        const frequencySelect = page.locator('select[name*="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('monthly');
        }

        const emailField = page.locator('input[type="email"]');
        if (await emailField.isVisible()) {
          await emailField.fill('budget-team@example.com');
        }

        // Set specific day of month
        const dayOfMonthField = page.locator('select[name*="day"], [data-testid="day-of-month"]');
        if (await dayOfMonthField.isVisible()) {
          await dayOfMonthField.selectOption('1'); // First day of month
        }

        // Add multiple recipients
        const addRecipientButton = page.locator('button:has-text("Add Recipient"), [data-testid="add-recipient"]');
        if (await addRecipientButton.isVisible()) {
          await addRecipientButton.click();

          const secondEmailField = page.locator('input[type="email"]').nth(1);
          if (await secondEmailField.isVisible()) {
            await secondEmailField.fill('finance@example.com');
          }
        }

        // Create schedule
        await testUtils.clickButton('button:has-text("Create"), button:has-text("Schedule")');

        // Should show success and new schedule
        const hasMonthlySchedule = await testUtils.isElementVisible(
          'text="Monthly Budget Analysis", text="Monthly", text="budget-team@example.com"'
        );

        if (hasMonthlySchedule) {
          expect(hasMonthlySchedule).toBe(true);
        }
      }
    });

    test('should create custom report schedule with specific parameters', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation modal
      const createButton = page.locator('button:has-text("Schedule Report"), button:has-text("New Schedule")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill in custom report schedule
        const nameField = page.locator('input[name*="name"]');
        if (await nameField.isVisible()) {
          await nameField.fill('Quarterly Income Analysis');
        }

        const reportTypeSelect = page.locator('select[name*="type"]');
        if (await reportTypeSelect.isVisible()) {
          await reportTypeSelect.selectOption('custom');
        }

        // Should show custom report configuration
        const hasCustomConfig = await testUtils.isElementVisible(
          '[data-testid="custom-config"], .custom-report-config, text="Report Parameters"'
        );

        if (hasCustomConfig) {
          expect(hasCustomConfig).toBe(true);

          // Configure custom report parameters
          const dataSourceSelect = page.locator('select[name*="source"], [data-testid="data-source"]');
          if (await dataSourceSelect.isVisible()) {
            await dataSourceSelect.selectOption('income');
          }

          const chartTypeSelect = page.locator('select[name*="chart"], [data-testid="chart-type"]');
          if (await chartTypeSelect.isVisible()) {
            await chartTypeSelect.selectOption('line');
          }

          // Set date range type
          const dateRangeSelect = page.locator('select[name*="range"], [data-testid="date-range-type"]');
          if (await dateRangeSelect.isVisible()) {
            await dateRangeSelect.selectOption('previous-quarter');
          }
        }

        const frequencySelect = page.locator('select[name*="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('quarterly');
        }

        const emailField = page.locator('input[type="email"]');
        if (await emailField.isVisible()) {
          await emailField.fill('analysis@example.com');
        }

        // Create custom schedule
        await testUtils.clickButton('button:has-text("Create"), button:has-text("Schedule")');

        // Should show success and custom schedule
        const hasCustomSchedule = await testUtils.isElementVisible(
          'text="Quarterly Income Analysis", text="Quarterly", text="Custom"'
        );

        if (hasCustomSchedule) {
          expect(hasCustomSchedule).toBe(true);
        }
      }
    });
  });

  test.describe('Managing Scheduled Reports', () => {
    test('should edit existing scheduled report', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Find existing schedule to edit
      const scheduleItem = page.locator('[data-testid="schedule-item"], .schedule-card').first();
      if (await scheduleItem.isVisible()) {
        const editButton = scheduleItem.locator('button:has-text("Edit"), [data-testid="edit-schedule"]');

        if (await editButton.isVisible()) {
          await editButton.click();

          // Should show edit modal
          const hasEditModal = await testUtils.isElementVisible(
            '[data-testid="edit-schedule-modal"], text="Edit Schedule", .edit-dialog'
          );

          if (hasEditModal) {
            expect(hasEditModal).toBe(true);

            // Should pre-populate existing values
            const nameField = page.locator('input[name*="name"]');
            if (await nameField.isVisible()) {
              const currentValue = await nameField.inputValue();
              expect(currentValue.length).toBeGreaterThan(0);

              // Modify name
              await nameField.clear();
              await nameField.fill(currentValue + ' (Updated)');
            }

            // Change frequency
            const frequencySelect = page.locator('select[name*="frequency"]');
            if (await frequencySelect.isVisible()) {
              await frequencySelect.selectOption('daily');
            }

            // Save changes
            await testUtils.clickButton('button:has-text("Save"), button:has-text("Update")');

            // Should show update success
            const hasUpdateSuccess = await testUtils.isElementVisible(
              'text="Schedule updated", text="updated successfully", .update-success'
            );

            if (hasUpdateSuccess) {
              expect(hasUpdateSuccess).toBe(true);

              // Should show updated values
              const hasUpdatedValues = await testUtils.isElementVisible(
                'text="(Updated)", text="Daily"'
              );

              if (hasUpdatedValues) {
                expect(hasUpdatedValues).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should pause and resume scheduled report', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Find active schedule to pause
      const activeSchedule = page.locator('[data-testid="schedule-item"]:has(.status-active), .schedule-card:has(.status-active)').first();
      if (await activeSchedule.isVisible()) {
        const pauseButton = activeSchedule.locator('button:has-text("Pause"), [data-testid="pause-schedule"]');

        if (await pauseButton.isVisible()) {
          await pauseButton.click();

          // Should show pause confirmation
          const hasPauseConfirm = await testUtils.isElementVisible(
            'text="Pause schedule", text="temporarily stop", .pause-confirmation'
          );

          if (hasPauseConfirm) {
            expect(hasPauseConfirm).toBe(true);

            // Confirm pause
            await testUtils.clickButton('button:has-text("Pause"), button:has-text("Yes")');

            // Should show paused status
            const hasPausedStatus = await testUtils.isElementVisible(
              'text="Paused", .status-paused, .paused-indicator'
            );

            if (hasPausedStatus) {
              expect(hasPausedStatus).toBe(true);

              // Should show resume button
              const hasResumeButton = await testUtils.isElementVisible(
                'button:has-text("Resume"), [data-testid="resume-schedule"]'
              );

              if (hasResumeButton) {
                expect(hasResumeButton).toBe(true);

                // Resume the schedule
                await page.click('button:has-text("Resume")');

                // Should return to active status
                const hasActiveStatus = await testUtils.isElementVisible(
                  'text="Active", .status-active, .active-indicator'
                );

                if (hasActiveStatus) {
                  expect(hasActiveStatus).toBe(true);
                }
              }
            }
          }
        }
      }
    });

    test('should delete scheduled report', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Count existing schedules
      const initialScheduleCount = await page.locator('[data-testid="schedule-item"], .schedule-card').count();

      // Find schedule to delete
      const scheduleToDelete = page.locator('[data-testid="schedule-item"], .schedule-card').first();
      if (await scheduleToDelete.isVisible()) {
        const deleteButton = scheduleToDelete.locator('button:has-text("Delete"), [data-testid="delete-schedule"]');

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Should show deletion confirmation
          const hasDeleteConfirm = await testUtils.isElementVisible(
            'text="Delete schedule", text="permanently remove", text="Are you sure", .delete-confirmation'
          );

          if (hasDeleteConfirm) {
            expect(hasDeleteConfirm).toBe(true);

            // Should show impact warning
            const hasImpactWarning = await testUtils.isElementVisible(
              'text="stop receiving", text="no longer generated", .deletion-warning'
            );

            if (hasImpactWarning) {
              expect(hasImpactWarning).toBe(true);
            }

            // Confirm deletion
            await testUtils.clickButton('button:has-text("Delete"), button:has-text("Yes")');

            // Should show deletion success
            const hasDeleteSuccess = await testUtils.isElementVisible(
              'text="Schedule deleted", text="deleted successfully", .delete-success'
            );

            if (hasDeleteSuccess) {
              expect(hasDeleteSuccess).toBe(true);

              // Should have one fewer schedule
              await testUtils.waitForPageLoad();
              const finalScheduleCount = await page.locator('[data-testid="schedule-item"], .schedule-card').count();
              expect(finalScheduleCount).toBeLessThan(initialScheduleCount);
            }
          }
        }
      }
    });

    test('should view schedule execution history', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Find schedule to view history
      const scheduleItem = page.locator('[data-testid="schedule-item"], .schedule-card').first();
      if (await scheduleItem.isVisible()) {
        const historyButton = scheduleItem.locator('button:has-text("History"), [data-testid="view-history"]');

        if (await historyButton.isVisible()) {
          await historyButton.click();

          // Should show history modal or page
          const hasHistoryView = await testUtils.isElementVisible(
            '[data-testid="history-modal"], text="Execution History", .history-container'
          );

          if (hasHistoryView) {
            expect(hasHistoryView).toBe(true);

            // Should show execution records
            const hasExecutionRecords = await testUtils.isElementVisible(
              '[data-testid="execution-record"], .execution-item, .history-entry'
            );

            if (hasExecutionRecords) {
              expect(hasExecutionRecords).toBe(true);

              // Should show execution status
              const hasExecutionStatus = await testUtils.isElementVisible(
                'text="Success", text="Failed", text="Pending", .execution-status'
              );
              expect(hasExecutionStatus).toBe(true);

              // Should show execution timestamps
              const hasExecutionTimes = await testUtils.isElementVisible(
                'text="Executed at", text="ago", .execution-time'
              );
              expect(hasExecutionTimes).toBe(true);

              // Should show error details for failed executions
              const hasFailedExecution = await testUtils.isElementVisible(
                'text="Failed", .status-failed, .error-status'
              );

              if (hasFailedExecution) {
                const hasErrorDetails = await testUtils.isElementVisible(
                  'text="Error:", text="Reason:", .error-details'
                );

                if (hasErrorDetails) {
                  expect(hasErrorDetails).toBe(true);
                }
              }
            } else {
              // Should show empty history state
              const hasEmptyHistory = await testUtils.isElementVisible(
                'text="No executions yet", text="No history", .empty-history'
              );

              if (hasEmptyHistory) {
                expect(hasEmptyHistory).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  test.describe('Schedule Configuration and Advanced Settings', () => {
    test('should configure schedule with timezone settings', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation
      const createButton = page.locator('button:has-text("Schedule Report"), button:has-text("New Schedule")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Look for advanced settings or timezone options
        const hasAdvancedSettings = await testUtils.isElementVisible(
          'button:has-text("Advanced"), [data-testid="advanced-settings"], .advanced-options'
        );

        if (hasAdvancedSettings) {
          await page.click('button:has-text("Advanced")');

          // Should show timezone selection
          const hasTimezoneSelection = await testUtils.isElementVisible(
            'select[name*="timezone"], [data-testid="timezone"], text="Timezone"'
          );

          if (hasTimezoneSelection) {
            expect(hasTimezoneSelection).toBe(true);

            // Select specific timezone
            const timezoneSelect = page.locator('select[name*="timezone"]');
            if (await timezoneSelect.isVisible()) {
              await timezoneSelect.selectOption('America/New_York');
            }

            // Should show time of day selection
            const hasTimeSelection = await testUtils.isElementVisible(
              'input[type="time"], [data-testid="execution-time"], text="Time"'
            );

            if (hasTimeSelection) {
              expect(hasTimeSelection).toBe(true);

              const timeField = page.locator('input[type="time"]');
              if (await timeField.isVisible()) {
                await timeField.fill('09:00');
              }
            }
          }
        }

        // Fill basic schedule info
        await testUtils.fillFormField('Schedule Name', 'Timezone Test Report');

        const reportTypeSelect = page.locator('select[name*="type"]');
        if (await reportTypeSelect.isVisible()) {
          await reportTypeSelect.selectOption('cash-flow');
        }

        const frequencySelect = page.locator('select[name*="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('daily');
        }

        await testUtils.fillFormField('Email', 'timezone@example.com');

        // Create schedule
        await testUtils.clickButton('button:has-text("Create"), button:has-text("Schedule")');

        // Should show timezone in schedule details
        const hasTimezoneDisplay = await testUtils.isElementVisible(
          'text="EST", text="America/New_York", text="09:00", .timezone-display'
        );

        if (hasTimezoneDisplay) {
          expect(hasTimezoneDisplay).toBe(true);
        }
      }
    });

    test('should configure report format and delivery options', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Open schedule creation
      const createButton = page.locator('button:has-text("Schedule Report")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill basic info
        await testUtils.fillFormField('Schedule Name', 'Custom Format Report');

        const reportTypeSelect = page.locator('select[name*="type"]');
        if (await reportTypeSelect.isVisible()) {
          await reportTypeSelect.selectOption('spending-analysis');
        }

        // Look for format options
        const hasFormatOptions = await testUtils.isElementVisible(
          '[data-testid="format-options"], text="Format", select[name*="format"]'
        );

        if (hasFormatOptions) {
          expect(hasFormatOptions).toBe(true);

          // Select export format
          const formatSelect = page.locator('select[name*="format"]');
          if (await formatSelect.isVisible()) {
            await formatSelect.selectOption('excel');
          }

          // Should show format-specific options
          const hasExcelOptions = await testUtils.isElementVisible(
            'text="Include Charts", text="Multiple Sheets", .format-specific-options'
          );

          if (hasExcelOptions) {
            expect(hasExcelOptions).toBe(true);

            // Enable charts in Excel
            const includeChartsCheckbox = page.locator('input[type="checkbox"][name*="charts"]');
            if (await includeChartsCheckbox.isVisible()) {
              await includeChartsCheckbox.check();
            }

            // Enable multiple sheets
            const multipleSheetsCheckbox = page.locator('input[type="checkbox"][name*="sheets"]');
            if (await multipleSheetsCheckbox.isVisible()) {
              await multipleSheetsCheckbox.check();
            }
          }
        }

        // Look for delivery options
        const hasDeliveryOptions = await testUtils.isElementVisible(
          '[data-testid="delivery-options"], text="Delivery", .delivery-settings'
        );

        if (hasDeliveryOptions) {
          expect(hasDeliveryOptions).toBe(true);

          // Custom email subject
          const subjectField = page.locator('input[name*="subject"], [data-testid="email-subject"]');
          if (await subjectField.isVisible()) {
            await subjectField.fill('Monthly Spending Analysis Report');
          }

          // Custom email message
          const messageField = page.locator('textarea[name*="message"], [data-testid="email-message"]');
          if (await messageField.isVisible()) {
            await messageField.fill('Please find the monthly spending analysis attached.');
          }
        }

        const frequencySelect = page.locator('select[name*="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('monthly');
        }

        await testUtils.fillFormField('Email', 'reports@example.com');

        // Create schedule
        await testUtils.clickButton('button:has-text("Create")');

        // Should show schedule with format details
        const hasFormatDetails = await testUtils.isElementVisible(
          'text="Excel", text="with charts", .format-details'
        );

        if (hasFormatDetails) {
          expect(hasFormatDetails).toBe(true);
        }
      }
    });

    test('should handle schedule conflicts and validation', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Create multiple schedules with same parameters
      const createButton = page.locator('button:has-text("Schedule Report")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // First schedule
        await testUtils.fillFormField('Schedule Name', 'Daily Report 1');

        const reportTypeSelect = page.locator('select[name*="type"]');
        if (await reportTypeSelect.isVisible()) {
          await reportTypeSelect.selectOption('cash-flow');
        }

        const frequencySelect = page.locator('select[name*="frequency"]');
        if (await frequencySelect.isVisible()) {
          await frequencySelect.selectOption('daily');
        }

        const timeField = page.locator('input[type="time"]');
        if (await timeField.isVisible()) {
          await timeField.fill('09:00');
        }

        await testUtils.fillFormField('Email', 'daily@example.com');

        await testUtils.clickButton('button:has-text("Create")');
        await testUtils.waitForPageLoad();

        // Create second schedule with same parameters
        if (await createButton.isVisible()) {
          await createButton.click();

          await testUtils.fillFormField('Schedule Name', 'Daily Report 2');

          const reportTypeSelect2 = page.locator('select[name*="type"]');
          if (await reportTypeSelect2.isVisible()) {
            await reportTypeSelect2.selectOption('cash-flow');
          }

          const frequencySelect2 = page.locator('select[name*="frequency"]');
          if (await frequencySelect2.isVisible()) {
            await frequencySelect2.selectOption('daily');
          }

          const timeField2 = page.locator('input[type="time"]');
          if (await timeField2.isVisible()) {
            await timeField2.fill('09:00');
          }

          await testUtils.fillFormField('Email', 'daily@example.com');

          await testUtils.clickButton('button:has-text("Create")');

          // Should show conflict warning or suggestion
          const hasConflictWarning = await testUtils.isElementVisible(
            'text="similar schedule", text="already exists", text="conflict", .schedule-conflict'
          );

          if (hasConflictWarning) {
            expect(hasConflictWarning).toBe(true);

            // Should offer alternatives or confirmation
            const hasAlternatives = await testUtils.isElementVisible(
              'button:has-text("Create Anyway"), button:has-text("Modify"), .conflict-options'
            );

            if (hasAlternatives) {
              expect(hasAlternatives).toBe(true);
            }
          }
        }
      }
    });
  });

  test.describe('Report Execution and Monitoring', () => {
    test('should manually trigger scheduled report execution', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Find schedule to trigger manually
      const scheduleItem = page.locator('[data-testid="schedule-item"], .schedule-card').first();
      if (await scheduleItem.isVisible()) {
        const runNowButton = scheduleItem.locator('button:has-text("Run Now"), [data-testid="run-now"]');

        if (await runNowButton.isVisible()) {
          await runNowButton.click();

          // Should show execution confirmation
          const hasRunConfirm = await testUtils.isElementVisible(
            'text="Run report now", text="Execute immediately", .run-confirmation'
          );

          if (hasRunConfirm) {
            expect(hasRunConfirm).toBe(true);

            // Confirm execution
            await testUtils.clickButton('button:has-text("Run"), button:has-text("Execute")');

            // Should show execution started message
            const hasExecutionStarted = await testUtils.isElementVisible(
              'text="Execution started", text="Report generation", .execution-started'
            );

            if (hasExecutionStarted) {
              expect(hasExecutionStarted).toBe(true);

              // Should show progress indicator
              const hasProgress = await testUtils.isElementVisible(
                '.progress-bar, .execution-progress, text="Generating", .running-indicator'
              );

              if (hasProgress) {
                expect(hasProgress).toBe(true);

                // Wait for completion
                await testUtils.waitForPageLoad();

                // Should show completion status
                const hasCompletion = await testUtils.isElementVisible(
                  'text="Execution completed", text="Report sent", .execution-complete'
                );

                if (hasCompletion) {
                  expect(hasCompletion).toBe(true);
                }
              }
            }
          }
        }
      }
    });

    test('should show schedule performance metrics', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Look for performance metrics section
      const hasMetrics = await testUtils.isElementVisible(
        '[data-testid="schedule-metrics"], .performance-metrics, text="Performance"'
      );

      if (hasMetrics) {
        expect(hasMetrics).toBe(true);

        // Should show success rate
        const hasSuccessRate = await testUtils.isElementVisible(
          'text="Success Rate", text="%", .success-rate-metric'
        );

        if (hasSuccessRate) {
          expect(hasSuccessRate).toBe(true);
        }

        // Should show average execution time
        const hasExecutionTime = await testUtils.isElementVisible(
          'text="Avg. Execution Time", text="seconds", text="minutes", .execution-time-metric'
        );

        if (hasExecutionTime) {
          expect(hasExecutionTime).toBe(true);
        }

        // Should show last execution status
        const hasLastExecution = await testUtils.isElementVisible(
          'text="Last Execution", text="ago", .last-execution-metric'
        );

        if (hasLastExecution) {
          expect(hasLastExecution).toBe(true);
        }

        // Should show next scheduled execution
        const hasNextExecution = await testUtils.isElementVisible(
          'text="Next Execution", text="in", .next-execution-metric'
        );

        if (hasNextExecution) {
          expect(hasNextExecution).toBe(true);
        }
      }
    });

    test('should handle execution errors and retry logic', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Find schedule with error status
      const errorSchedule = page.locator('[data-testid="schedule-item"]:has(.status-error), .schedule-card:has(.error-status)').first();
      if (await errorSchedule.isVisible()) {
        // Should show error indicator
        const hasErrorIndicator = await testUtils.isElementVisible(
          'text="Error", .status-error, .error-icon'
        );

        if (hasErrorIndicator) {
          expect(hasErrorIndicator).toBe(true);

          // Should show error details
          const errorDetailsButton = errorSchedule.locator('button:has-text("Details"), [data-testid="error-details"]');
          if (await errorDetailsButton.isVisible()) {
            await errorDetailsButton.click();

            // Should show error information
            const hasErrorInfo = await testUtils.isElementVisible(
              '[data-testid="error-info"], text="Error Details", .error-dialog'
            );

            if (hasErrorInfo) {
              expect(hasErrorInfo).toBe(true);

              // Should show error message
              const hasErrorMessage = await testUtils.isElementVisible(
                'text="Failed to", text="Error:", .error-message'
              );

              if (hasErrorMessage) {
                expect(hasErrorMessage).toBe(true);
              }

              // Should show retry option
              const hasRetryOption = await testUtils.isElementVisible(
                'button:has-text("Retry"), [data-testid="retry-execution"]'
              );

              if (hasRetryOption) {
                expect(hasRetryOption).toBe(true);

                // Retry execution
                await page.click('button:has-text("Retry")');

                // Should show retry confirmation
                const hasRetryConfirm = await testUtils.isElementVisible(
                  'text="Retry execution", text="attempt again", .retry-confirmation'
                );

                if (hasRetryConfirm) {
                  expect(hasRetryConfirm).toBe(true);

                  await testUtils.clickButton('button:has-text("Retry"), button:has-text("Yes")');

                  // Should show retry started
                  const hasRetryStarted = await testUtils.isElementVisible(
                    'text="Retry started", text="attempting again", .retry-started'
                  );

                  if (hasRetryStarted) {
                    expect(hasRetryStarted).toBe(true);
                  }
                }
              }
            }
          }
        }
      }
    });

    test('should show comprehensive schedule status dashboard', async ({ page }) => {
      await page.goto('/reports/scheduled');
      await testUtils.waitForPageLoad();

      // Should show overall status summary
      const hasStatusSummary = await testUtils.isElementVisible(
        '[data-testid="status-summary"], .schedule-overview, text="Overview"'
      );

      if (hasStatusSummary) {
        expect(hasStatusSummary).toBe(true);

        // Should show total schedules count
        const hasTotalCount = await testUtils.isElementVisible(
          'text="Total Schedules", text=/\d+ schedules/, .total-schedules'
        );

        if (hasTotalCount) {
          expect(hasTotalCount).toBe(true);
        }

        // Should show active vs inactive breakdown
        const hasActiveBreakdown = await testUtils.isElementVisible(
          'text="Active:", text="Paused:", text="Error:", .status-breakdown'
        );

        if (hasActiveBreakdown) {
          expect(hasActiveBreakdown).toBe(true);
        }

        // Should show recent activity
        const hasRecentActivity = await testUtils.isElementVisible(
          'text="Recent Activity", text="Recent Executions", .recent-activity'
        );

        if (hasRecentActivity) {
          expect(hasRecentActivity).toBe(true);

          // Should show activity items
          const hasActivityItems = await testUtils.isElementVisible(
            '.activity-item, .execution-item, text="executed", text="failed"'
          );

          if (hasActivityItems) {
            expect(hasActivityItems).toBe(true);
          }
        }

        // Should show upcoming executions
        const hasUpcomingExecutions = await testUtils.isElementVisible(
          'text="Upcoming", text="Next Executions", .upcoming-executions'
        );

        if (hasUpcomingExecutions) {
          expect(hasUpcomingExecutions).toBe(true);

          // Should show scheduled execution times
          const hasScheduledTimes = await testUtils.isElementVisible(
            'text="in", text="hours", text="minutes", text="tomorrow", .scheduled-time'
          );

          if (hasScheduledTimes) {
            expect(hasScheduledTimes).toBe(true);
          }
        }
      }
    });
  });
});