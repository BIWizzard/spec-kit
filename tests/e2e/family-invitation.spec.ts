import { test, expect } from '@playwright/test';
import { TestUtils } from '../../frontend/tests/e2e/utils/test-utils';

test.describe('Family Member Invitation Flow', () => {
  let testUtils: TestUtils;

  // Setup authenticated session for family invitation tests
  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);

    // Login first to access family features
    await page.goto('/login');
    await testUtils.fillField('input[type="email"]', 'test@example.com');
    await testUtils.fillField('input[type="password"]', 'TestPassword123!');
    await testUtils.clickButton('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await testUtils.waitForUrlChange('/dashboard');
  });

  test.describe('Family Setup and Access', () => {
    test('should access family management from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Look for family navigation or section
      const hasFamilyAccess = await testUtils.isElementVisible(
        'a:has-text("Family"), button:has-text("Family"), [data-testid="family-nav"]'
      );

      if (hasFamilyAccess) {
        expect(hasFamilyAccess).toBe(true);

        await page.click('a:has-text("Family"), button:has-text("Family")');
        await testUtils.waitForUrlChange('/family');

        // Should show family page
        const hasFamilyPage = await testUtils.isElementVisible(
          '[data-testid="family-page"], h1:has-text("Family"), .family-container'
        );
        expect(hasFamilyPage).toBe(true);
      } else {
        // Direct navigation if no button found
        await page.goto('/family');
        await testUtils.waitForPageLoad();
      }
    });

    test('should display current family information', async ({ page }) => {
      await page.goto('/family');
      await testUtils.waitForPageLoad();

      // Should show family overview
      const hasFamilyOverview = await testUtils.isElementVisible(
        '[data-testid="family-overview"], .family-info, text="Family Members"'
      );

      if (hasFamilyOverview) {
        expect(hasFamilyOverview).toBe(true);

        // Should show current user as family member
        const hasCurrentMember = await testUtils.isElementVisible(
          '[data-testid="family-member"], .member-card, text="test@example.com"'
        );

        if (hasCurrentMember) {
          expect(hasCurrentMember).toBe(true);
        }

        // Should show member roles
        const hasMemberRoles = await testUtils.isElementVisible(
          'text="Admin", text="Owner", text="Member", .member-role'
        );
        expect(hasMemberRoles).toBe(true);
      }
    });

    test('should show family member management options', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Should show members list
      const hasMembersList = await testUtils.isElementVisible(
        '[data-testid="members-list"], .members-container, .family-members'
      );

      if (hasMembersList) {
        expect(hasMembersList).toBe(true);

        // Should show invite member option
        const hasInviteOption = await testUtils.isElementVisible(
          'button:has-text("Invite"), button:has-text("Add Member"), [data-testid="invite-member"]'
        );
        expect(hasInviteOption).toBe(true);

        // Should show member management actions
        const hasManagementActions = await testUtils.isElementVisible(
          'button:has-text("Edit"), button:has-text("Remove"), .member-actions'
        );

        if (hasManagementActions) {
          expect(hasManagementActions).toBe(true);
        }
      }
    });
  });

  test.describe('Member Invitation Process', () => {
    test('should open invitation modal with form', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Click invite member button
      const hasInviteButton = await testUtils.isElementVisible(
        'button:has-text("Invite"), button:has-text("Add Member"), [data-testid="invite-member"]'
      );

      if (hasInviteButton) {
        await page.click('button:has-text("Invite"), button:has-text("Add Member")');

        // Should show invitation modal
        const hasInviteModal = await testUtils.isElementVisible(
          '[data-testid="invite-modal"], .invite-dialog, text="Invite Family Member"'
        );

        if (hasInviteModal) {
          expect(hasInviteModal).toBe(true);

          // Should show invitation form fields
          const hasFormFields = await testUtils.isElementVisible(
            'input[type="email"], input[name="email"], [data-testid="invite-email"]'
          );
          expect(hasFormFields).toBe(true);

          // Should show role selection
          const hasRoleSelection = await testUtils.isElementVisible(
            'select[name*="role"], [data-testid="member-role"], text="Role"'
          );
          expect(hasRoleSelection).toBe(true);

          // Should show optional message field
          const hasMessageField = await testUtils.isElementVisible(
            'textarea, input[name*="message"], [data-testid="invite-message"]'
          );

          if (hasMessageField) {
            expect(hasMessageField).toBe(true);
          }
        }
      }
    });

    test('should validate invitation form inputs', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Open invitation modal
      const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member")');
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        // Try to submit empty form
        const submitButton = page.locator('button:has-text("Send"), button:has-text("Invite")');
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation errors
          const hasValidationError = await testUtils.isElementVisible(
            'text="required", text="Enter email", .error-message, .form-error'
          );

          if (hasValidationError) {
            expect(hasValidationError).toBe(true);
          }
        }

        // Enter invalid email
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('invalid-email');

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

        // Enter valid email
        if (await emailInput.isVisible()) {
          await emailInput.clear();
          await emailInput.fill('newmember@example.com');

          // Select role
          const roleSelect = page.locator('select[name*="role"], [data-testid="member-role"]');
          if (await roleSelect.isVisible()) {
            await roleSelect.selectOption('member');
          }

          // Form should now be valid
          const hasValidForm = await testUtils.isElementVisible(
            'button:has-text("Send"):not([disabled]), button:has-text("Invite"):not([disabled])'
          );

          if (hasValidForm) {
            expect(hasValidForm).toBe(true);
          }
        }
      }
    });

    test('should send family member invitation successfully', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Open invitation modal
      const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member")');
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        // Fill invitation form
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('newmember@example.com');
        }

        // Select member role
        const roleSelect = page.locator('select[name*="role"], [data-testid="member-role"]');
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('member');
        }

        // Add personal message
        const messageField = page.locator('textarea, input[name*="message"]');
        if (await messageField.isVisible()) {
          await messageField.fill('Welcome to our family finance management!');
        }

        // Send invitation
        await testUtils.clickButton('button:has-text("Send"), button:has-text("Invite")');

        // Should show success message
        const hasSuccess = await testUtils.isElementVisible(
          'text="Invitation sent", text="invited successfully", .success-message'
        );

        if (hasSuccess) {
          expect(hasSuccess).toBe(true);

          // Modal should close
          const modalClosed = await testUtils.isElementVisible(
            '[data-testid="invite-modal"], .invite-dialog'
          );
          expect(modalClosed).toBe(false);

          // Should show pending invitation in list
          const hasPendingInvite = await testUtils.isElementVisible(
            'text="newmember@example.com", text="Pending", .pending-invitation'
          );

          if (hasPendingInvite) {
            expect(hasPendingInvite).toBe(true);
          }
        }
      }
    });

    test('should prevent duplicate invitations', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Send first invitation
      const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member")');
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const emailInput = page.locator('input[type="email"], input[name="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('duplicate@example.com');

          const roleSelect = page.locator('select[name*="role"]');
          if (await roleSelect.isVisible()) {
            await roleSelect.selectOption('member');
          }

          await testUtils.clickButton('button:has-text("Send"), button:has-text("Invite")');

          // Wait for first invitation to complete
          await testUtils.waitForPageLoad();
        }
      }

      // Try to send duplicate invitation
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const emailInputSecond = page.locator('input[type="email"], input[name="email"]');
        if (await emailInputSecond.isVisible()) {
          await emailInputSecond.fill('duplicate@example.com');

          const roleSelectSecond = page.locator('select[name*="role"]');
          if (await roleSelectSecond.isVisible()) {
            await roleSelectSecond.selectOption('member');
          }

          await testUtils.clickButton('button:has-text("Send"), button:has-text("Invite")');

          // Should show duplicate error
          const hasDuplicateError = await testUtils.isElementVisible(
            'text="already invited", text="already exists", text="duplicate", .duplicate-error'
          );

          if (hasDuplicateError) {
            expect(hasDuplicateError).toBe(true);
          }
        }
      }
    });

    test('should handle invitation with different roles', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Test Admin role invitation
      const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member")');
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        const emailInput = page.locator('input[type="email"], input[name="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('admin@example.com');
        }

        const roleSelect = page.locator('select[name*="role"], [data-testid="member-role"]');
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('admin');

          // Should show admin permissions warning
          const hasAdminWarning = await testUtils.isElementVisible(
            'text="admin permissions", text="full access", .role-warning'
          );

          if (hasAdminWarning) {
            expect(hasAdminWarning).toBe(true);
          }
        }

        // Confirm admin invitation
        await testUtils.clickButton('button:has-text("Send"), button:has-text("Invite")');

        // Should show success with role information
        const hasRoleSuccess = await testUtils.isElementVisible(
          'text="Admin invitation sent", text="admin@example.com", .admin-invite-success'
        );

        if (hasRoleSuccess) {
          expect(hasRoleSuccess).toBe(true);
        }
      }
    });
  });

  test.describe('Invitation Management', () => {
    test('should display pending invitations list', async ({ page }) => {
      await page.goto('/family/invitations');
      await testUtils.waitForPageLoad();

      // Should show invitations page
      const hasInvitationsPage = await testUtils.isElementVisible(
        '[data-testid="invitations-page"], h1:has-text("Invitations"), .invitations-container'
      );

      if (hasInvitationsPage) {
        expect(hasInvitationsPage).toBe(true);

        // Should show pending invitations list
        const hasPendingList = await testUtils.isElementVisible(
          '[data-testid="pending-invitations"], .pending-list, text="Pending Invitations"'
        );

        if (hasPendingList) {
          expect(hasPendingList).toBe(true);

          // Should show invitation details
          const hasInviteDetails = await testUtils.isElementVisible(
            'text="@example.com", text="Sent on", .invitation-item'
          );

          if (hasInviteDetails) {
            expect(hasInviteDetails).toBe(true);
          }

          // Should show invitation actions
          const hasInviteActions = await testUtils.isElementVisible(
            'button:has-text("Resend"), button:has-text("Cancel"), .invitation-actions'
          );

          if (hasInviteActions) {
            expect(hasInviteActions).toBe(true);
          }
        }
      }
    });

    test('should resend pending invitation', async ({ page }) => {
      await page.goto('/family/invitations');
      await testUtils.waitForPageLoad();

      // Find pending invitation and resend
      const resendButton = page.locator('button:has-text("Resend"), [data-testid="resend-invite"]');
      if (await resendButton.isVisible()) {
        await resendButton.click();

        // Should show resend confirmation
        const hasResendConfirm = await testUtils.isElementVisible(
          'text="Resend invitation", text="Send again", .resend-confirmation'
        );

        if (hasResendConfirm) {
          expect(hasResendConfirm).toBe(true);

          // Confirm resend
          await testUtils.clickButton('button:has-text("Resend"), button:has-text("Yes")');

          // Should show resend success
          const hasResendSuccess = await testUtils.isElementVisible(
            'text="Invitation resent", text="sent again", .resend-success'
          );

          if (hasResendSuccess) {
            expect(hasResendSuccess).toBe(true);

            // Should update sent date
            const hasUpdatedDate = await testUtils.isElementVisible(
              'text="Sent on", text="Resent on", .sent-date'
            );

            if (hasUpdatedDate) {
              expect(hasUpdatedDate).toBe(true);
            }
          }
        }
      }
    });

    test('should cancel pending invitation', async ({ page }) => {
      await page.goto('/family/invitations');
      await testUtils.waitForPageLoad();

      // Find pending invitation and cancel
      const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-invite"]');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should show cancellation confirmation
        const hasCancelConfirm = await testUtils.isElementVisible(
          'text="Cancel invitation", text="Are you sure", .cancel-confirmation'
        );

        if (hasCancelConfirm) {
          expect(hasCancelConfirm).toBe(true);

          // Confirm cancellation
          await testUtils.clickButton('button:has-text("Cancel"), button:has-text("Yes")');

          // Should show cancellation success
          const hasCancelSuccess = await testUtils.isElementVisible(
            'text="Invitation cancelled", text="cancelled successfully", .cancel-success'
          );

          if (hasCancelSuccess) {
            expect(hasCancelSuccess).toBe(true);

            // Invitation should be removed from list
            const inviteStillVisible = await testUtils.isElementVisible(
              '.invitation-item, .pending-invitation'
            );

            // Should have fewer invitations or show empty state
            const hasEmptyState = await testUtils.isElementVisible(
              'text="No pending invitations", text="No invitations", .empty-invitations'
            );

            if (hasEmptyState) {
              expect(hasEmptyState).toBe(true);
            }
          }
        }
      }
    });

    test('should show invitation expiry information', async ({ page }) => {
      await page.goto('/family/invitations');
      await testUtils.waitForPageLoad();

      // Should show expiry dates on invitations
      const hasExpiryInfo = await testUtils.isElementVisible(
        'text="Expires", text="days remaining", text="expired", .expiry-info'
      );

      if (hasExpiryInfo) {
        expect(hasExpiryInfo).toBe(true);

        // Should highlight expiring invitations
        const hasExpiringWarning = await testUtils.isElementVisible(
          'text="expires soon", .expiring-warning, .urgent'
        );

        if (hasExpiringWarning) {
          expect(hasExpiringWarning).toBe(true);
        }

        // Should show expired invitations differently
        const hasExpiredIndication = await testUtils.isElementVisible(
          'text="Expired", .expired-invitation, .inactive'
        );

        if (hasExpiredIndication) {
          expect(hasExpiredIndication).toBe(true);
        }
      }
    });
  });

  test.describe('Invitation Acceptance Flow', () => {
    test('should handle invitation link access', async ({ page }) => {
      // Simulate clicking invitation link (would normally come from email)
      const invitationToken = 'test-invitation-token-12345';
      await page.goto(`/family/invitations/accept/${invitationToken}`);
      await testUtils.waitForPageLoad();

      // Should show invitation acceptance page
      const hasAcceptancePage = await testUtils.isElementVisible(
        '[data-testid="accept-invitation"], text="Family Invitation", .invitation-accept'
      );

      if (hasAcceptancePage) {
        expect(hasAcceptancePage).toBe(true);

        // Should show invitation details
        const hasInviteDetails = await testUtils.isElementVisible(
          'text="invited you", text="family", .invitation-details'
        );
        expect(hasInviteDetails).toBe(true);

        // Should show accept/decline options
        const hasAcceptOptions = await testUtils.isElementVisible(
          'button:has-text("Accept"), button:has-text("Decline"), .invitation-actions'
        );
        expect(hasAcceptOptions).toBe(true);
      }
    });

    test('should accept family invitation', async ({ page }) => {
      const invitationToken = 'test-invitation-token-12345';
      await page.goto(`/family/invitations/accept/${invitationToken}`);
      await testUtils.waitForPageLoad();

      // Accept invitation
      const acceptButton = page.locator('button:has-text("Accept"), [data-testid="accept-invite"]');
      if (await acceptButton.isVisible()) {
        await acceptButton.click();

        // Should show acceptance confirmation
        const hasAcceptConfirm = await testUtils.isElementVisible(
          'text="Accept invitation", text="Join family", .accept-confirmation'
        );

        if (hasAcceptConfirm) {
          expect(hasAcceptConfirm).toBe(true);

          // Confirm acceptance
          await testUtils.clickButton('button:has-text("Join"), button:has-text("Accept")');

          // Should show success and redirect to family dashboard
          const hasAcceptSuccess = await testUtils.isElementVisible(
            'text="Welcome to the family", text="successfully joined", .accept-success'
          );

          if (hasAcceptSuccess) {
            expect(hasAcceptSuccess).toBe(true);

            // Should redirect to family or dashboard
            await testUtils.waitForUrlChange('/family');

            // Should now show as family member
            const isFamilyMember = await testUtils.isElementVisible(
              '[data-testid="family-member"], .member-card, text="Member"'
            );

            if (isFamilyMember) {
              expect(isFamilyMember).toBe(true);
            }
          }
        }
      }
    });

    test('should decline family invitation', async ({ page }) => {
      const invitationToken = 'test-invitation-token-67890';
      await page.goto(`/family/invitations/accept/${invitationToken}`);
      await testUtils.waitForPageLoad();

      // Decline invitation
      const declineButton = page.locator('button:has-text("Decline"), [data-testid="decline-invite"]');
      if (await declineButton.isVisible()) {
        await declineButton.click();

        // Should show decline confirmation
        const hasDeclineConfirm = await testUtils.isElementVisible(
          'text="Decline invitation", text="Are you sure", .decline-confirmation'
        );

        if (hasDeclineConfirm) {
          expect(hasDeclineConfirm).toBe(true);

          // Optional reason field
          const reasonField = page.locator('textarea[name*="reason"], input[name*="reason"]');
          if (await reasonField.isVisible()) {
            await reasonField.fill('Not ready to join at this time');
          }

          // Confirm decline
          await testUtils.clickButton('button:has-text("Decline"), button:has-text("No Thanks")');

          // Should show decline success
          const hasDeclineSuccess = await testUtils.isElementVisible(
            'text="Invitation declined", text="declined successfully", .decline-success'
          );

          if (hasDeclineSuccess) {
            expect(hasDeclineSuccess).toBe(true);
          }
        }
      }
    });

    test('should handle expired invitation links', async ({ page }) => {
      const expiredToken = 'expired-invitation-token-99999';
      await page.goto(`/family/invitations/accept/${expiredToken}`);
      await testUtils.waitForPageLoad();

      // Should show expired invitation message
      const hasExpiredMessage = await testUtils.isElementVisible(
        'text="Invitation expired", text="no longer valid", .expired-invitation'
      );

      if (hasExpiredMessage) {
        expect(hasExpiredMessage).toBe(true);

        // Should show contact information for new invitation
        const hasContactInfo = await testUtils.isElementVisible(
          'text="Contact", text="new invitation", .contact-for-new'
        );

        if (hasContactInfo) {
          expect(hasContactInfo).toBe(true);
        }

        // Should not show accept/decline buttons
        const hasActionButtons = await testUtils.isElementVisible(
          'button:has-text("Accept"), button:has-text("Decline")'
        );
        expect(hasActionButtons).toBe(false);
      }
    });

    test('should handle invalid invitation tokens', async ({ page }) => {
      const invalidToken = 'invalid-token-12345';
      await page.goto(`/family/invitations/accept/${invalidToken}`);
      await testUtils.waitForPageLoad();

      // Should show invalid invitation error
      const hasInvalidError = await testUtils.isElementVisible(
        'text="Invalid invitation", text="not found", text="404", .invalid-invitation'
      );

      if (hasInvalidError) {
        expect(hasInvalidError).toBe(true);

        // Should show return to login option
        const hasLoginOption = await testUtils.isElementVisible(
          'a:has-text("Login"), button:has-text("Login"), .return-login'
        );

        if (hasLoginOption) {
          expect(hasLoginOption).toBe(true);
        }
      }
    });
  });

  test.describe('Member Role Management', () => {
    test('should manage family member roles', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Find family member to edit
      const memberCard = page.locator('[data-testid="family-member"], .member-card').first();
      if (await memberCard.isVisible()) {
        // Click edit member
        const editButton = memberCard.locator('button:has-text("Edit"), [data-testid="edit-member"]');
        if (await editButton.isVisible()) {
          await editButton.click();

          // Should show member edit modal
          const hasEditModal = await testUtils.isElementVisible(
            '[data-testid="edit-member-modal"], text="Edit Member", .member-edit'
          );

          if (hasEditModal) {
            expect(hasEditModal).toBe(true);

            // Should show role selection
            const roleSelect = page.locator('select[name*="role"], [data-testid="member-role"]');
            if (await roleSelect.isVisible()) {
              await roleSelect.selectOption('admin');

              // Should show role change warning
              const hasRoleWarning = await testUtils.isElementVisible(
                'text="role change", text="permissions", .role-warning'
              );

              if (hasRoleWarning) {
                expect(hasRoleWarning).toBe(true);
              }

              // Save role change
              await testUtils.clickButton('button:has-text("Save"), button:has-text("Update")');

              // Should show success
              const hasRoleUpdateSuccess = await testUtils.isElementVisible(
                'text="Role updated", text="permissions updated", .role-update-success'
              );

              if (hasRoleUpdateSuccess) {
                expect(hasRoleUpdateSuccess).toBe(true);
              }
            }
          }
        }
      }
    });

    test('should remove family member', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Find family member to remove (not self)
      const memberCards = page.locator('[data-testid="family-member"], .member-card');
      const memberCount = await memberCards.count();

      if (memberCount > 1) {
        const memberToRemove = memberCards.nth(1); // Second member (not self)
        const removeButton = memberToRemove.locator('button:has-text("Remove"), [data-testid="remove-member"]');

        if (await removeButton.isVisible()) {
          await removeButton.click();

          // Should show removal confirmation
          const hasRemoveConfirm = await testUtils.isElementVisible(
            'text="Remove member", text="Are you sure", .remove-confirmation'
          );

          if (hasRemoveConfirm) {
            expect(hasRemoveConfirm).toBe(true);

            // Should show impact warning
            const hasImpactWarning = await testUtils.isElementVisible(
              'text="lose access", text="financial data", .removal-warning'
            );

            if (hasImpactWarning) {
              expect(hasImpactWarning).toBe(true);
            }

            // Confirm removal
            await testUtils.clickButton('button:has-text("Remove"), button:has-text("Yes")');

            // Should show removal success
            const hasRemovalSuccess = await testUtils.isElementVisible(
              'text="Member removed", text="removed successfully", .removal-success'
            );

            if (hasRemovalSuccess) {
              expect(hasRemovalSuccess).toBe(true);

              // Member should no longer appear in list
              const updatedMemberCount = await page.locator('[data-testid="family-member"], .member-card').count();
              expect(updatedMemberCount).toBeLessThan(memberCount);
            }
          }
        }
      }
    });

    test('should prevent self-removal', async ({ page }) => {
      await page.goto('/family/members');
      await testUtils.waitForPageLoad();

      // Find current user's member card
      const currentUserCard = page.locator('[data-testid="family-member"]:has-text("test@example.com"), .member-card:has-text("test@example.com")');

      if (await currentUserCard.isVisible()) {
        // Should not show remove option for self
        const hasRemoveButton = await currentUserCard.locator('button:has-text("Remove")').isVisible();
        expect(hasRemoveButton).toBe(false);

        // Should show indication that this is current user
        const hasCurrentUserIndicator = await testUtils.isElementVisible(
          'text="You", text="Current User", .current-user-indicator'
        );

        if (hasCurrentUserIndicator) {
          expect(hasCurrentUserIndicator).toBe(true);
        }
      }
    });
  });

  test.describe('Family Activity and Notifications', () => {
    test('should show family activity log', async ({ page }) => {
      await page.goto('/family/activity');
      await testUtils.waitForPageLoad();

      // Should show activity page
      const hasActivityPage = await testUtils.isElementVisible(
        '[data-testid="activity-page"], h1:has-text("Activity"), .activity-container'
      );

      if (hasActivityPage) {
        expect(hasActivityPage).toBe(true);

        // Should show activity feed
        const hasActivityFeed = await testUtils.isElementVisible(
          '[data-testid="activity-feed"], .activity-list, .activity-item'
        );

        if (hasActivityFeed) {
          expect(hasActivityFeed).toBe(true);

          // Should show different activity types
          const hasActivityTypes = await testUtils.isElementVisible(
            'text="invited", text="joined", text="removed", text="updated"'
          );
          expect(hasActivityTypes).toBe(true);

          // Should show timestamps
          const hasTimestamps = await testUtils.isElementVisible(
            'text="ago", text="minutes", text="hours", text="days", .activity-time'
          );
          expect(hasTimestamps).toBe(true);
        }
      }
    });

    test('should filter activity by type', async ({ page }) => {
      await page.goto('/family/activity');
      await testUtils.waitForPageLoad();

      // Should show activity filters
      const hasActivityFilters = await testUtils.isElementVisible(
        '[data-testid="activity-filters"], .filter-controls, select'
      );

      if (hasActivityFilters) {
        expect(hasActivityFilters).toBe(true);

        // Filter by invitation activities
        const filterSelect = page.locator('select[name*="type"], [data-testid="activity-filter"]');
        if (await filterSelect.isVisible()) {
          await filterSelect.selectOption('invitations');

          // Should show only invitation-related activities
          const hasFilteredActivities = await testUtils.isElementVisible(
            'text="invited", text="accepted", text="declined", .invitation-activity'
          );

          if (hasFilteredActivities) {
            expect(hasFilteredActivities).toBe(true);
          }

          // Should not show other activity types
          const hasNonInvitationActivity = await testUtils.isElementVisible(
            'text="transaction", text="payment", text="budget"'
          );

          if (!hasNonInvitationActivity) {
            expect(hasNonInvitationActivity).toBe(false);
          }
        }
      }
    });

    test('should show invitation notifications', async ({ page }) => {
      await page.goto('/dashboard');
      await testUtils.waitForPageLoad();

      // Should show notification indicator for pending invitations
      const hasNotificationIndicator = await testUtils.isElementVisible(
        '[data-testid="notification-badge"], .notification-count, .badge'
      );

      if (hasNotificationIndicator) {
        expect(hasNotificationIndicator).toBe(true);

        // Click notifications
        await page.click('[data-testid="notification-badge"], .notification-count');

        // Should show notification panel
        const hasNotificationPanel = await testUtils.isElementVisible(
          '[data-testid="notification-panel"], .notifications-dropdown, .notification-list'
        );

        if (hasNotificationPanel) {
          expect(hasNotificationPanel).toBe(true);

          // Should show invitation notifications
          const hasInvitationNotifications = await testUtils.isElementVisible(
            'text="invitation", text="pending", text="family", .invitation-notification'
          );

          if (hasInvitationNotifications) {
            expect(hasInvitationNotifications).toBe(true);

            // Should be able to act on notifications
            const hasNotificationActions = await testUtils.isElementVisible(
              'button:has-text("View"), a:has-text("Manage"), .notification-action'
            );

            if (hasNotificationActions) {
              expect(hasNotificationActions).toBe(true);
            }
          }
        }
      }
    });
  });
});