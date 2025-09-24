import { Resend } from 'resend';

export type EmailTemplate =
  | 'welcome'
  | 'family_invitation'
  | 'password_reset'
  | 'email_verification'
  | 'report_ready'
  | 'export_ready'
  | 'payment_reminder'
  | 'budget_alert'
  | 'bank_sync_error'
  | 'monthly_summary';

export type EmailPriority = 'low' | 'normal' | 'high';

export type EmailData = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  priority?: EmailPriority;
  scheduledFor?: Date;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
};

export type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'complained';

export type EmailJob = {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  status: EmailStatus;
  priority: EmailPriority;
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  resendId?: string; // Resend message ID
  createdAt: Date;
  updatedAt: Date;
};

export class EmailService {
  private static resend: Resend;
  private static fromEmail = process.env.EMAIL_FROM || 'Family Finance <noreply@familyfinance.com>';
  private static replyToEmail = process.env.EMAIL_REPLY_TO || 'support@familyfinance.com';

  static initialize(): void {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not found. Email service will be disabled.');
      return;
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  static async sendEmail(emailData: EmailData): Promise<EmailJob> {
    // Normalize recipients
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const ccRecipients = emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : undefined;
    const bccRecipients = emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : undefined;

    // Create email job in database
    const emailJob = await prisma.emailJob.create({
      data: {
        to: recipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data,
        status: emailData.scheduledFor ? 'queued' : 'sending',
        priority: emailData.priority || 'normal',
        scheduledFor: emailData.scheduledFor,
      },
    });

    // If scheduled for later, return job without sending
    if (emailData.scheduledFor && emailData.scheduledFor > new Date()) {
      return this.mapEmailJob(emailJob);
    }

    // Send immediately
    try {
      await this.processEmailJob(emailJob.id);
      return this.mapEmailJob(await prisma.emailJob.findUnique({ where: { id: emailJob.id } })!);
    } catch (error) {
      await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: {
          status: 'failed',
          error: error.message,
          updatedAt: new Date(),
        },
      });
      throw error;
    }
  }

  static async sendWelcomeEmail(email: string, userData: {
    firstName: string;
    familyName: string;
    loginUrl: string;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `Welcome to Family Finance, ${userData.firstName}!`,
      template: 'welcome',
      data: userData,
      priority: 'normal',
    });
  }

  static async sendFamilyInvitation(email: string, invitationData: {
    inviterName: string;
    familyName: string;
    acceptUrl: string;
    expiresAt: Date;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `You're invited to join ${invitationData.familyName} on Family Finance`,
      template: 'family_invitation',
      data: invitationData,
      priority: 'high',
    });
  }

  static async sendPasswordReset(email: string, resetData: {
    firstName: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: 'Reset your Family Finance password',
      template: 'password_reset',
      data: resetData,
      priority: 'high',
    });
  }

  static async sendEmailVerification(email: string, verificationData: {
    firstName: string;
    verificationUrl: string;
    expiresAt: Date;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      template: 'email_verification',
      data: verificationData,
      priority: 'normal',
    });
  }

  static async sendReportReady(email: string, reportData: {
    reportName: string;
    reportType: string;
    downloadUrl: string;
    expiresAt: Date;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `Your ${reportData.reportName} report is ready`,
      template: 'report_ready',
      data: reportData,
      priority: 'normal',
    });
  }

  static async sendExportReady(email: string, exportData: {
    exportType: string;
    downloadUrl: string;
    expiresAt: Date;
    fileSize?: string;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: 'Your data export is ready for download',
      template: 'export_ready',
      data: exportData,
      priority: 'normal',
    });
  }

  static async sendPaymentReminder(email: string, reminderData: {
    firstName: string;
    payments: Array<{
      payee: string;
      amount: number;
      dueDate: Date;
      daysUntilDue: number;
    }>;
    totalAmount: number;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `Payment reminder: ${reminderData.payments.length} payment${reminderData.payments.length > 1 ? 's' : ''} due soon`,
      template: 'payment_reminder',
      data: reminderData,
      priority: 'normal',
    });
  }

  static async sendBudgetAlert(email: string, alertData: {
    firstName: string;
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    percentageUsed: number;
    alertType: 'warning' | 'exceeded';
  }): Promise<EmailJob> {
    const subject = alertData.alertType === 'exceeded'
      ? `Budget exceeded: ${alertData.categoryName}`
      : `Budget warning: ${alertData.categoryName}`;

    return this.sendEmail({
      to: email,
      subject,
      template: 'budget_alert',
      data: alertData,
      priority: 'high',
    });
  }

  static async sendBankSyncError(email: string, errorData: {
    firstName: string;
    bankName: string;
    accountName: string;
    errorMessage: string;
    reconnectUrl: string;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `Action required: ${errorData.bankName} connection needs attention`,
      template: 'bank_sync_error',
      data: errorData,
      priority: 'high',
    });
  }

  static async sendMonthlySummary(email: string, summaryData: {
    firstName: string;
    month: string;
    year: number;
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number;
    topExpenses: Array<{
      description: string;
      amount: number;
      category: string;
    }>;
    budgetPerformance: number;
    viewReportUrl: string;
  }): Promise<EmailJob> {
    return this.sendEmail({
      to: email,
      subject: `Your ${summaryData.month} ${summaryData.year} financial summary`,
      template: 'monthly_summary',
      data: summaryData,
      priority: 'normal',
    });
  }

  static async getEmailJobs(
    familyId?: string,
    status?: EmailStatus,
    limit: number = 50
  ): Promise<EmailJob[]> {
    const jobs = await prisma.emailJob.findMany({
      where: {
        ...(familyId && { familyId }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map(this.mapEmailJob);
  }

  static async getEmailJob(jobId: string): Promise<EmailJob | null> {
    const job = await prisma.emailJob.findUnique({
      where: { id: jobId },
    });

    return job ? this.mapEmailJob(job) : null;
  }

  static async retryFailedEmail(jobId: string): Promise<EmailJob> {
    const job = await prisma.emailJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Email job not found');
    }

    if (job.status !== 'failed') {
      throw new Error('Only failed emails can be retried');
    }

    // Reset status and clear error
    await prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: 'sending',
        error: null,
        updatedAt: new Date(),
      },
    });

    try {
      await this.processEmailJob(jobId);
      const updatedJob = await prisma.emailJob.findUnique({ where: { id: jobId } })!;
      return this.mapEmailJob(updatedJob);
    } catch (error) {
      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message,
          updatedAt: new Date(),
        },
      });
      throw error;
    }
  }

  static async processScheduledEmails(): Promise<void> {
    const dueEmails = await prisma.emailJob.findMany({
      where: {
        status: 'queued',
        scheduledFor: {
          lte: new Date(),
        },
      },
      orderBy: [
        { priority: 'desc' }, // high, normal, low
        { createdAt: 'asc' },
      ],
      take: 50, // Process in batches
    });

    for (const emailJob of dueEmails) {
      try {
        await this.processEmailJob(emailJob.id);
      } catch (error) {
        console.error(`Failed to process email job ${emailJob.id}:`, error);
      }
    }
  }

  private static async processEmailJob(jobId: string): Promise<void> {
    if (!this.resend) {
      throw new Error('Email service not initialized');
    }

    const job = await prisma.emailJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Email job not found');
    }

    // Update status to sending
    await prisma.emailJob.update({
      where: { id: jobId },
      data: { status: 'sending', updatedAt: new Date() },
    });

    try {
      // Render email template
      const emailContent = await this.renderTemplate(job.template as EmailTemplate, job.data as Record<string, any>);

      // Prepare attachments if any
      const attachments = (job as any).attachments ? (job as any).attachments.map((att: any) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })) : undefined;

      // Send email via Resend
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: job.to as string[],
        cc: job.cc as string[] || undefined,
        bcc: job.bcc as string[] || undefined,
        reply_to: this.replyToEmail,
        subject: job.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments,
      });

      // Update job as sent
      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          resendId: response.data?.id,
          updatedAt: new Date(),
        },
      });

    } catch (error) {
      // Update job as failed
      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message,
          updatedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private static async renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): Promise<{ html: string; text: string }> {
    // In a real implementation, you would use a templating engine like Handlebars or React Email
    // For now, we'll use simple string templates

    switch (template) {
      case 'welcome':
        return {
          html: `
            <h1>Welcome to Family Finance, ${data.firstName}!</h1>
            <p>You've successfully joined the ${data.familyName} family.</p>
            <p><a href="${data.loginUrl}">Login to your account</a></p>
          `,
          text: `Welcome to Family Finance, ${data.firstName}! You've successfully joined the ${data.familyName} family. Login: ${data.loginUrl}`,
        };

      case 'family_invitation':
        return {
          html: `
            <h1>You're invited to join ${data.familyName}!</h1>
            <p>${data.inviterName} has invited you to join their family on Family Finance.</p>
            <p><a href="${data.acceptUrl}">Accept Invitation</a></p>
            <p>This invitation expires on ${data.expiresAt.toLocaleDateString()}.</p>
          `,
          text: `You're invited to join ${data.familyName}! ${data.inviterName} has invited you. Accept: ${data.acceptUrl}`,
        };

      case 'password_reset':
        return {
          html: `
            <h1>Reset Your Password</h1>
            <p>Hi ${data.firstName},</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${data.resetUrl}">Reset Password</a></p>
            <p>This link expires on ${data.expiresAt.toLocaleDateString()}.</p>
          `,
          text: `Reset your password: ${data.resetUrl}`,
        };

      case 'report_ready':
        return {
          html: `
            <h1>Your ${data.reportName} Report is Ready</h1>
            <p>Your ${data.reportType} report has been generated and is ready for download.</p>
            <p><a href="${data.downloadUrl}">Download Report</a></p>
            <p>This download link expires on ${data.expiresAt.toLocaleDateString()}.</p>
          `,
          text: `Your ${data.reportName} report is ready: ${data.downloadUrl}`,
        };

      case 'export_ready':
        return {
          html: `
            <h1>Your Export is Ready</h1>
            <p>Your ${data.exportType} export has been processed and is ready for download.</p>
            <p><a href="${data.downloadUrl}">Download Export</a></p>
            ${data.fileSize ? `<p>File size: ${data.fileSize}</p>` : ''}
            <p>This download link expires on ${data.expiresAt.toLocaleDateString()}.</p>
          `,
          text: `Your ${data.exportType} export is ready: ${data.downloadUrl}`,
        };

      case 'payment_reminder':
        const paymentsList = data.payments.map((p: any) =>
          `<li>${p.payee}: $${p.amount.toFixed(2)} (due ${p.dueDate.toLocaleDateString()})</li>`
        ).join('');

        return {
          html: `
            <h1>Payment Reminder</h1>
            <p>Hi ${data.firstName},</p>
            <p>You have ${data.payments.length} payment${data.payments.length > 1 ? 's' : ''} due soon:</p>
            <ul>${paymentsList}</ul>
            <p>Total amount: $${data.totalAmount.toFixed(2)}</p>
          `,
          text: `Payment reminder: ${data.payments.length} payments totaling $${data.totalAmount.toFixed(2)} due soon.`,
        };

      case 'budget_alert':
        return {
          html: `
            <h1>Budget ${data.alertType === 'exceeded' ? 'Exceeded' : 'Warning'}</h1>
            <p>Hi ${data.firstName},</p>
            <p>Your ${data.categoryName} budget has ${data.alertType === 'exceeded' ? 'been exceeded' : 'reached ' + data.percentageUsed + '%'}.</p>
            <p>Budget: $${data.budgetAmount.toFixed(2)} | Spent: $${data.spentAmount.toFixed(2)}</p>
          `,
          text: `Budget ${data.alertType}: ${data.categoryName} - $${data.spentAmount} of $${data.budgetAmount} (${data.percentageUsed}%)`,
        };

      case 'bank_sync_error':
        return {
          html: `
            <h1>Bank Connection Issue</h1>
            <p>Hi ${data.firstName},</p>
            <p>We're having trouble syncing your ${data.bankName} account (${data.accountName}).</p>
            <p>Error: ${data.errorMessage}</p>
            <p><a href="${data.reconnectUrl}">Reconnect Account</a></p>
          `,
          text: `Bank sync error for ${data.bankName} (${data.accountName}). Reconnect: ${data.reconnectUrl}`,
        };

      case 'monthly_summary':
        const expensesList = data.topExpenses.map((e: any) =>
          `<li>${e.description}: $${e.amount.toFixed(2)} (${e.category})</li>`
        ).join('');

        return {
          html: `
            <h1>Your ${data.month} ${data.year} Financial Summary</h1>
            <p>Hi ${data.firstName},</p>
            <p><strong>Income:</strong> $${data.totalIncome.toFixed(2)}</p>
            <p><strong>Expenses:</strong> $${data.totalExpenses.toFixed(2)}</p>
            <p><strong>Net Cash Flow:</strong> $${data.netCashFlow.toFixed(2)}</p>
            <p><strong>Savings Rate:</strong> ${data.savingsRate.toFixed(1)}%</p>
            <p><strong>Top Expenses:</strong></p>
            <ul>${expensesList}</ul>
            <p><a href="${data.viewReportUrl}">View Full Report</a></p>
          `,
          text: `${data.month} ${data.year} Summary - Income: $${data.totalIncome}, Expenses: $${data.totalExpenses}, Savings Rate: ${data.savingsRate}%`,
        };

      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  private static mapEmailJob(job: any): EmailJob {
    return {
      id: job.id,
      to: job.to,
      cc: job.cc,
      bcc: job.bcc,
      subject: job.subject,
      template: job.template,
      data: job.data,
      status: job.status,
      priority: job.priority,
      scheduledFor: job.scheduledFor,
      sentAt: job.sentAt,
      error: job.error,
      resendId: job.resendId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

// Initialize the service
EmailService.initialize();

// Export for cron job integration
export async function processScheduledEmails(): Promise<void> {
  await EmailService.processScheduledEmails();
}