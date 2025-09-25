import { EmailService, EmailTemplate, EmailData, EmailPriority, EmailStatus } from '../../backend/src/services/email.service';
import { Resend } from 'resend';

// Mock Resend
jest.mock('resend');
const MockResend = Resend as jest.MockedClass<typeof Resend>;

// Mock Prisma
const mockPrisma = {
  emailJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

// Mock prisma import by replacing the require/import
jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Add prisma to global scope for the service
global.prisma = mockPrisma as any;

describe('EmailService', () => {
  let mockResendInstance: jest.Mocked<Resend>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.EMAIL_FROM = 'Test <test@example.com>';
    process.env.EMAIL_REPLY_TO = 'reply@example.com';
    process.env.FRONTEND_URL = 'https://app.familyfinance.com';

    // Create mock Resend instance
    mockResendInstance = {
      emails: {
        send: jest.fn(),
      },
    } as any;

    MockResend.mockImplementation(() => mockResendInstance);

    // Reinitialize the service with test environment
    EmailService.initialize();
  });

  afterEach(() => {
    delete global.prisma;
  });

  describe('initialize', () => {
    it('should initialize Resend client with API key', () => {
      process.env.RESEND_API_KEY = 'test-key';

      EmailService.initialize();

      expect(MockResend).toHaveBeenCalledWith('test-key');
    });

    it('should log warning when API key is missing', () => {
      delete process.env.RESEND_API_KEY;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      EmailService.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('RESEND_API_KEY not found. Email service will be disabled.');
      consoleSpy.mockRestore();
    });
  });

  describe('sendEmail', () => {
    const mockEmailData: EmailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'welcome',
      data: { firstName: 'John', familyName: 'Doe Family', loginUrl: 'https://app.com/login' },
      priority: 'normal',
    };

    const mockEmailJob = {
      id: 'job-123',
      to: ['test@example.com'],
      cc: null,
      bcc: null,
      subject: 'Test Email',
      template: 'welcome',
      data: mockEmailData.data,
      status: 'sending',
      priority: 'normal',
      scheduledFor: null,
      sentAt: null,
      error: null,
      resendId: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    beforeEach(() => {
      mockPrisma.emailJob.create.mockResolvedValue(mockEmailJob);
      mockPrisma.emailJob.findUnique.mockResolvedValue({ ...mockEmailJob, status: 'sent' });
      mockResendInstance.emails.send.mockResolvedValue({
        data: { id: 'resend-123' },
        error: null,
      } as any);
    });

    it('should create email job and send immediately', async () => {
      const result = await EmailService.sendEmail(mockEmailData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: {
          to: ['test@example.com'],
          cc: undefined,
          bcc: undefined,
          subject: 'Test Email',
          template: 'welcome',
          data: mockEmailData.data,
          status: 'sending',
          priority: 'normal',
          scheduledFor: undefined,
        },
      });

      expect(result.id).toBe('job-123');
    });

    it('should normalize string recipients to arrays', async () => {
      await EmailService.sendEmail(mockEmailData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          to: ['test@example.com'],
        }),
      });
    });

    it('should handle array recipients', async () => {
      const multiRecipientData = {
        ...mockEmailData,
        to: ['test1@example.com', 'test2@example.com'],
        cc: ['cc@example.com'],
        bcc: 'bcc@example.com',
      };

      await EmailService.sendEmail(multiRecipientData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          to: ['test1@example.com', 'test2@example.com'],
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
        }),
      });
    });

    it('should queue email when scheduled for future', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const scheduledData = {
        ...mockEmailData,
        scheduledFor: futureDate,
      };

      mockPrisma.emailJob.create.mockResolvedValue({
        ...mockEmailJob,
        status: 'queued',
        scheduledFor: futureDate,
      });

      const result = await EmailService.sendEmail(scheduledData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'queued',
          scheduledFor: futureDate,
        }),
      });

      expect(result.status).toBe('queued');
    });

    it('should use default priority when not specified', async () => {
      const dataWithoutPriority = { ...mockEmailData };
      delete dataWithoutPriority.priority;

      await EmailService.sendEmail(dataWithoutPriority);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'normal',
        }),
      });
    });

    it('should handle send failure and update job status', async () => {
      const sendError = new Error('Send failed');
      mockResendInstance.emails.send.mockRejectedValue(sendError);
      mockPrisma.emailJob.update.mockResolvedValue(mockEmailJob);

      await expect(EmailService.sendEmail(mockEmailData)).rejects.toThrow('Send failed');

      expect(mockPrisma.emailJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'failed',
          error: 'Send failed',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('sendWelcomeEmail', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({
        id: 'welcome-123',
        status: 'sent',
      } as any);
    });

    it('should send welcome email with correct data', async () => {
      const userData = {
        firstName: 'John',
        familyName: 'Doe Family',
        loginUrl: 'https://app.com/login',
      };

      await EmailService.sendWelcomeEmail('john@example.com', userData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: 'Welcome to Family Finance, John!',
        template: 'welcome',
        data: userData,
        priority: 'normal',
      });
    });
  });

  describe('sendFamilyInvitation', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({
        id: 'invite-123',
        status: 'sent',
      } as any);
    });

    it('should send family invitation with correct data', async () => {
      const invitationData = {
        inviterName: 'Jane Doe',
        familyName: 'Doe Family',
        acceptUrl: 'https://app.com/accept',
        expiresAt: new Date('2024-01-07'),
      };

      await EmailService.sendFamilyInvitation('invite@example.com', invitationData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'invite@example.com',
        subject: "You're invited to join Doe Family on Family Finance",
        template: 'family_invitation',
        data: invitationData,
        priority: 'high',
      });
    });
  });

  describe('sendPasswordReset', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({
        id: 'reset-123',
        status: 'sent',
      } as any);
    });

    it('should send password reset with correct data', async () => {
      const resetData = {
        firstName: 'John',
        resetUrl: 'https://app.com/reset',
        expiresAt: new Date('2024-01-02'),
      };

      await EmailService.sendPasswordReset('reset@example.com', resetData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'reset@example.com',
        subject: 'Reset your Family Finance password',
        template: 'password_reset',
        data: resetData,
        priority: 'high',
      });
    });
  });

  describe('sendPaymentReminder', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({
        id: 'reminder-123',
        status: 'sent',
      } as any);
    });

    it('should send payment reminder with singular payment', async () => {
      const reminderData = {
        firstName: 'John',
        payments: [{
          payee: 'Electric Company',
          amount: 150,
          dueDate: new Date('2024-01-15'),
          daysUntilDue: 3,
        }],
        totalAmount: 150,
      };

      await EmailService.sendPaymentReminder('reminder@example.com', reminderData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'reminder@example.com',
        subject: 'Payment reminder: 1 payment due soon',
        template: 'payment_reminder',
        data: reminderData,
        priority: 'normal',
      });
    });

    it('should send payment reminder with plural payments', async () => {
      const reminderData = {
        firstName: 'John',
        payments: [
          {
            payee: 'Electric Company',
            amount: 150,
            dueDate: new Date('2024-01-15'),
            daysUntilDue: 3,
          },
          {
            payee: 'Internet',
            amount: 80,
            dueDate: new Date('2024-01-16'),
            daysUntilDue: 4,
          },
        ],
        totalAmount: 230,
      };

      await EmailService.sendPaymentReminder('reminder@example.com', reminderData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'reminder@example.com',
        subject: 'Payment reminder: 2 payments due soon',
        template: 'payment_reminder',
        data: reminderData,
        priority: 'normal',
      });
    });
  });

  describe('sendBudgetAlert', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmail').mockResolvedValue({
        id: 'alert-123',
        status: 'sent',
      } as any);
    });

    it('should send budget warning alert', async () => {
      const alertData = {
        firstName: 'John',
        categoryName: 'Groceries',
        budgetAmount: 500,
        spentAmount: 450,
        percentageUsed: 90,
        alertType: 'warning' as const,
      };

      await EmailService.sendBudgetAlert('alert@example.com', alertData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'alert@example.com',
        subject: 'Budget warning: Groceries',
        template: 'budget_alert',
        data: alertData,
        priority: 'high',
      });
    });

    it('should send budget exceeded alert', async () => {
      const alertData = {
        firstName: 'John',
        categoryName: 'Dining Out',
        budgetAmount: 300,
        spentAmount: 350,
        percentageUsed: 116.7,
        alertType: 'exceeded' as const,
      };

      await EmailService.sendBudgetAlert('alert@example.com', alertData);

      expect(EmailService.sendEmail).toHaveBeenCalledWith({
        to: 'alert@example.com',
        subject: 'Budget exceeded: Dining Out',
        template: 'budget_alert',
        data: alertData,
        priority: 'high',
      });
    });
  });

  describe('getEmailJobs', () => {
    const mockJobs = [
      {
        id: 'job-1',
        to: ['test1@example.com'],
        subject: 'Test 1',
        template: 'welcome',
        data: {},
        status: 'sent',
        priority: 'normal',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'job-2',
        to: ['test2@example.com'],
        subject: 'Test 2',
        template: 'password_reset',
        data: {},
        status: 'failed',
        priority: 'high',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    beforeEach(() => {
      mockPrisma.emailJob.findMany.mockResolvedValue(mockJobs);
    });

    it('should get all email jobs with default limit', async () => {
      const result = await EmailService.getEmailJobs();

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
    });

    it('should filter by family ID', async () => {
      await EmailService.getEmailJobs('family-123');

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by status', async () => {
      await EmailService.getEmailJobs(undefined, 'failed');

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should use custom limit', async () => {
      await EmailService.getEmailJobs(undefined, undefined, 25);

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    });

    it('should filter by both family ID and status', async () => {
      await EmailService.getEmailJobs('family-123', 'sent', 10);

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-123', status: 'sent' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });

  describe('getEmailJob', () => {
    const mockJob = {
      id: 'job-123',
      to: ['test@example.com'],
      subject: 'Test Email',
      template: 'welcome',
      data: {},
      status: 'sent',
      priority: 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return email job when found', async () => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(mockJob);

      const result = await EmailService.getEmailJob('job-123');

      expect(mockPrisma.emailJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-123' },
      });
      expect(result?.id).toBe('job-123');
    });

    it('should return null when job not found', async () => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(null);

      const result = await EmailService.getEmailJob('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('retryFailedEmail', () => {
    const mockFailedJob = {
      id: 'failed-job',
      to: ['test@example.com'],
      subject: 'Failed Email',
      template: 'welcome',
      data: {},
      status: 'failed',
      priority: 'normal',
      error: 'Previous error',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(mockFailedJob);
      mockPrisma.emailJob.update.mockResolvedValue({
        ...mockFailedJob,
        status: 'sent',
        error: null,
      });
      mockResendInstance.emails.send.mockResolvedValue({
        data: { id: 'resend-retry-123' },
        error: null,
      } as any);
    });

    it('should retry failed email successfully', async () => {
      const result = await EmailService.retryFailedEmail('failed-job');

      expect(mockPrisma.emailJob.update).toHaveBeenCalledWith({
        where: { id: 'failed-job' },
        data: {
          status: 'sending',
          error: null,
          updatedAt: expect.any(Date),
        },
      });

      expect(result.status).toBe('sent');
    });

    it('should throw error when job not found', async () => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(null);

      await expect(EmailService.retryFailedEmail('nonexistent')).rejects.toThrow('Email job not found');
    });

    it('should throw error when job is not failed', async () => {
      mockPrisma.emailJob.findUnique.mockResolvedValue({
        ...mockFailedJob,
        status: 'sent',
      });

      await expect(EmailService.retryFailedEmail('failed-job')).rejects.toThrow('Only failed emails can be retried');
    });

    it('should handle retry failure', async () => {
      const retryError = new Error('Retry failed');
      mockResendInstance.emails.send.mockRejectedValue(retryError);

      await expect(EmailService.retryFailedEmail('failed-job')).rejects.toThrow('Retry failed');

      expect(mockPrisma.emailJob.update).toHaveBeenLastCalledWith({
        where: { id: 'failed-job' },
        data: {
          status: 'failed',
          error: 'Retry failed',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('processScheduledEmails', () => {
    const mockScheduledJobs = [
      {
        id: 'scheduled-1',
        priority: 'high',
        createdAt: new Date('2024-01-01T08:00:00Z'),
      },
      {
        id: 'scheduled-2',
        priority: 'normal',
        createdAt: new Date('2024-01-01T09:00:00Z'),
      },
    ];

    beforeEach(() => {
      mockPrisma.emailJob.findMany.mockResolvedValue(mockScheduledJobs);
      jest.spyOn(EmailService as any, 'processEmailJob').mockResolvedValue(undefined);
    });

    it('should process scheduled emails in priority order', async () => {
      await EmailService.processScheduledEmails();

      expect(mockPrisma.emailJob.findMany).toHaveBeenCalledWith({
        where: {
          status: 'queued',
          scheduledFor: {
            lte: expect.any(Date),
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: 50,
      });

      expect(EmailService['processEmailJob']).toHaveBeenCalledTimes(2);
      expect(EmailService['processEmailJob']).toHaveBeenNthCalledWith(1, 'scheduled-1');
      expect(EmailService['processEmailJob']).toHaveBeenNthCalledWith(2, 'scheduled-2');
    });

    it('should continue processing other emails when one fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      EmailService['processEmailJob']
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce(undefined);

      await EmailService.processScheduledEmails();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to process email job scheduled-1:', expect.any(Error));
      expect(EmailService['processEmailJob']).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should handle empty scheduled jobs list', async () => {
      mockPrisma.emailJob.findMany.mockResolvedValue([]);

      await EmailService.processScheduledEmails();

      expect(EmailService['processEmailJob']).not.toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      jest.spyOn(EmailService, 'sendEmailVerification').mockResolvedValue({ id: 'test' } as any);
      jest.spyOn(EmailService, 'sendPasswordReset').mockResolvedValue({ id: 'test' } as any);
      jest.spyOn(EmailService, 'sendFamilyInvitation').mockResolvedValue({ id: 'test' } as any);
    });

    describe('sendVerificationEmail', () => {
      it('should send verification email with token URL', async () => {
        await EmailService.sendVerificationEmail('user@example.com', 'verification-token-123');

        expect(EmailService.sendEmailVerification).toHaveBeenCalledWith('user@example.com', {
          firstName: 'User',
          verificationUrl: 'https://app.familyfinance.com/verify-email?token=verification-token-123',
          expiresAt: expect.any(Date),
        });
      });
    });

    describe('sendPasswordResetEmail', () => {
      it('should send password reset email with token URL', async () => {
        await EmailService.sendPasswordResetEmail('user@example.com', 'reset-token-123');

        expect(EmailService.sendPasswordReset).toHaveBeenCalledWith('user@example.com', {
          firstName: 'User',
          resetUrl: 'https://app.familyfinance.com/reset-password?token=reset-token-123',
          expiresAt: expect.any(Date),
        });
      });
    });

    describe('sendInvitationEmail', () => {
      it('should send invitation email with token and family ID', async () => {
        await EmailService.sendInvitationEmail('invite@example.com', 'invite-token-123', 'family-456');

        expect(EmailService.sendFamilyInvitation).toHaveBeenCalledWith('invite@example.com', {
          familyName: 'Family',
          inviterName: 'Admin',
          acceptUrl: 'https://app.familyfinance.com/accept-invitation?token=invite-token-123&familyId=family-456',
          expiresAt: expect.any(Date),
        });
      });
    });
  });

  describe('template rendering', () => {
    let renderTemplate: (template: EmailTemplate, data: Record<string, any>) => Promise<{ html: string; text: string }>;

    beforeEach(() => {
      // Access private method for testing
      renderTemplate = EmailService['renderTemplate'].bind(EmailService);
    });

    describe('welcome template', () => {
      it('should render welcome template correctly', async () => {
        const data = {
          firstName: 'John',
          familyName: 'Doe Family',
          loginUrl: 'https://app.com/login',
        };

        const result = await renderTemplate('welcome', data);

        expect(result.html).toContain('Welcome to Family Finance, John!');
        expect(result.html).toContain('Doe Family');
        expect(result.html).toContain('https://app.com/login');
        expect(result.text).toContain('Welcome to Family Finance, John!');
      });
    });

    describe('family_invitation template', () => {
      it('should render family invitation template correctly', async () => {
        const data = {
          familyName: 'Smith Family',
          inviterName: 'Jane Smith',
          acceptUrl: 'https://app.com/accept',
          expiresAt: new Date('2024-01-07'),
        };

        const result = await renderTemplate('family_invitation', data);

        expect(result.html).toContain("You're invited to join Smith Family!");
        expect(result.html).toContain('Jane Smith has invited you');
        expect(result.html).toContain('https://app.com/accept');
        expect(result.html).toContain('1/7/2024'); // Date formatting
        expect(result.text).toContain('Smith Family');
      });
    });

    describe('password_reset template', () => {
      it('should render password reset template correctly', async () => {
        const data = {
          firstName: 'John',
          resetUrl: 'https://app.com/reset',
          expiresAt: new Date('2024-01-02'),
        };

        const result = await renderTemplate('password_reset', data);

        expect(result.html).toContain('Reset Your Password');
        expect(result.html).toContain('Hi John,');
        expect(result.html).toContain('https://app.com/reset');
        expect(result.text).toContain('Reset your password: https://app.com/reset');
      });
    });

    describe('budget_alert template', () => {
      it('should render budget warning template correctly', async () => {
        const data = {
          firstName: 'John',
          categoryName: 'Groceries',
          budgetAmount: 500,
          spentAmount: 450,
          percentageUsed: 90,
          alertType: 'warning',
        };

        const result = await renderTemplate('budget_alert', data);

        expect(result.html).toContain('Budget Warning');
        expect(result.html).toContain('Hi John,');
        expect(result.html).toContain('reached 90%');
        expect(result.html).toContain('Budget: $500.00 | Spent: $450.00');
        expect(result.text).toContain('Budget warning: Groceries');
      });

      it('should render budget exceeded template correctly', async () => {
        const data = {
          firstName: 'Jane',
          categoryName: 'Dining Out',
          budgetAmount: 300,
          spentAmount: 350,
          percentageUsed: 116.7,
          alertType: 'exceeded',
        };

        const result = await renderTemplate('budget_alert', data);

        expect(result.html).toContain('Budget Exceeded');
        expect(result.html).toContain('Hi Jane,');
        expect(result.html).toContain('been exceeded');
        expect(result.html).toContain('Budget: $300.00 | Spent: $350.00');
        expect(result.text).toContain('Budget exceeded: Dining Out');
      });
    });

    describe('payment_reminder template', () => {
      it('should render payment reminder with multiple payments', async () => {
        const data = {
          firstName: 'John',
          payments: [
            {
              payee: 'Electric Company',
              amount: 150.50,
              dueDate: new Date('2024-01-15'),
              daysUntilDue: 3,
            },
            {
              payee: 'Internet Provider',
              amount: 79.99,
              dueDate: new Date('2024-01-16'),
              daysUntilDue: 4,
            },
          ],
          totalAmount: 230.49,
        };

        const result = await renderTemplate('payment_reminder', data);

        expect(result.html).toContain('Payment Reminder');
        expect(result.html).toContain('Hi John,');
        expect(result.html).toContain('2 payments due soon');
        expect(result.html).toContain('Electric Company: $150.50');
        expect(result.html).toContain('Internet Provider: $79.99');
        expect(result.html).toContain('Total amount: $230.49');
        expect(result.text).toContain('2 payments totaling $230.49');
      });
    });

    describe('monthly_summary template', () => {
      it('should render monthly summary template correctly', async () => {
        const data = {
          firstName: 'John',
          month: 'January',
          year: 2024,
          totalIncome: 5000,
          totalExpenses: 3500,
          netCashFlow: 1500,
          savingsRate: 30,
          topExpenses: [
            { description: 'Rent', amount: 1200, category: 'Housing' },
            { description: 'Groceries', amount: 400, category: 'Food' },
          ],
          budgetPerformance: 85.5,
          viewReportUrl: 'https://app.com/report',
        };

        const result = await renderTemplate('monthly_summary', data);

        expect(result.html).toContain('Your January 2024 Financial Summary');
        expect(result.html).toContain('Hi John,');
        expect(result.html).toContain('Income: $5000.00');
        expect(result.html).toContain('Expenses: $3500.00');
        expect(result.html).toContain('Net Cash Flow: $1500.00');
        expect(result.html).toContain('Savings Rate: 30.0%');
        expect(result.html).toContain('Rent: $1200.00 (Housing)');
        expect(result.html).toContain('Groceries: $400.00 (Food)');
        expect(result.text).toContain('January 2024 Summary');
        expect(result.text).toContain('Savings Rate: 30%');
      });
    });

    it('should throw error for unknown template', async () => {
      await expect(renderTemplate('unknown_template' as EmailTemplate, {})).rejects.toThrow('Unknown email template: unknown_template');
    });
  });

  describe('email processing integration', () => {
    const mockEmailJob = {
      id: 'job-123',
      to: ['test@example.com'],
      cc: null,
      bcc: null,
      subject: 'Test Email',
      template: 'welcome',
      data: { firstName: 'John', familyName: 'Doe Family', loginUrl: 'https://app.com' },
      status: 'sending',
      priority: 'normal',
      scheduledFor: null,
    };

    beforeEach(() => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(mockEmailJob);
      mockPrisma.emailJob.update.mockResolvedValue(mockEmailJob);
      mockResendInstance.emails.send.mockResolvedValue({
        data: { id: 'resend-123' },
        error: null,
      } as any);
    });

    it('should process email job successfully', async () => {
      await EmailService['processEmailJob']('job-123');

      expect(mockPrisma.emailJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: { status: 'sending', updatedAt: expect.any(Date) },
      });

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'Test <test@example.com>',
        to: ['test@example.com'],
        cc: undefined,
        bcc: undefined,
        reply_to: 'reply@example.com',
        subject: 'Test Email',
        html: expect.stringContaining('Welcome to Family Finance, John!'),
        text: expect.stringContaining('Welcome to Family Finance, John!'),
        attachments: undefined,
      });

      expect(mockPrisma.emailJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'sent',
          sentAt: expect.any(Date),
          resendId: 'resend-123',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle email job not found', async () => {
      mockPrisma.emailJob.findUnique.mockResolvedValue(null);

      await expect(EmailService['processEmailJob']('nonexistent')).rejects.toThrow('Email job not found');
    });

    it('should handle email service not initialized', async () => {
      // Temporarily set resend to null
      EmailService['resend'] = null as any;

      await expect(EmailService['processEmailJob']('job-123')).rejects.toThrow('Email service not initialized');

      // Restore
      EmailService.initialize();
    });

    it('should handle attachments in email processing', async () => {
      const jobWithAttachments = {
        ...mockEmailJob,
        attachments: [
          {
            filename: 'report.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf',
          },
        ],
      };

      mockPrisma.emailJob.findUnique.mockResolvedValue(jobWithAttachments);

      await EmailService['processEmailJob']('job-123');

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: 'report.pdf',
              content: Buffer.from('test content'),
              content_type: 'application/pdf',
            },
          ],
        })
      );
    });

    it('should update job status to failed on processing error', async () => {
      const processingError = new Error('Template rendering failed');
      mockResendInstance.emails.send.mockRejectedValue(processingError);

      await expect(EmailService['processEmailJob']('job-123')).rejects.toThrow('Template rendering failed');

      expect(mockPrisma.emailJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'failed',
          error: 'Template rendering failed',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty recipient arrays', async () => {
      const emailData: EmailData = {
        to: [],
        subject: 'Empty Recipients',
        template: 'welcome',
        data: {},
      };

      mockPrisma.emailJob.create.mockResolvedValue({
        id: 'empty-job',
        to: [],
        status: 'sending',
      } as any);

      const result = await EmailService.sendEmail(emailData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          to: [],
        }),
      });
    });

    it('should handle null CC and BCC recipients', async () => {
      const emailData: EmailData = {
        to: 'test@example.com',
        cc: undefined,
        bcc: null as any,
        subject: 'Test Email',
        template: 'welcome',
        data: {},
      };

      await EmailService.sendEmail(emailData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cc: undefined,
          bcc: undefined,
        }),
      });
    });

    it('should handle scheduled email exactly at current time', async () => {
      const now = new Date();
      const emailData: EmailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        data: {},
        scheduledFor: now,
      };

      mockPrisma.emailJob.create.mockResolvedValue({
        id: 'current-time-job',
        scheduledFor: now,
        status: 'sending',
      } as any);

      // Should send immediately since scheduledFor is not > now
      const result = await EmailService.sendEmail(emailData);

      expect(mockPrisma.emailJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'sending', // Not queued
        }),
      });
    });
  });
});