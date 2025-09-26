import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

export type ScheduledReportType =
  | 'cash_flow'
  | 'spending_analysis'
  | 'budget_performance'
  | 'income_analysis'
  | 'net_worth'
  | 'savings_rate'
  | 'monthly_summary'
  | 'annual_summary';

export type ScheduledReportFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type ScheduledReportStatus = 'active' | 'paused' | 'error' | 'completed';

export type CreateScheduledReportData = {
  name: string;
  reportType: ScheduledReportType;
  frequency: ScheduledReportFrequency;
  recipients: string[]; // Email addresses
  parameters?: Record<string, any>; // Report-specific parameters
  description?: string;
  timezone?: string;
  deliveryDay?: number; // Day of week (0-6) for weekly, day of month (1-31) for monthly
  deliveryHour?: number; // Hour of day (0-23)
  startDate?: Date; // When to start generating reports
};

export type UpdateScheduledReportData = {
  name?: string;
  frequency?: ScheduledReportFrequency;
  recipients?: string[];
  parameters?: Record<string, any>;
  description?: string;
  status?: ScheduledReportStatus;
  deliveryDay?: number;
  deliveryHour?: number;
  timezone?: string;
};

export type ScheduledReportExecution = {
  id: string;
  scheduledReportId: string;
  executedAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reportData?: any;
  error?: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  deliveryError?: string;
};

export class ScheduledReportService {
  static async getScheduledReports(
    familyId: string,
    filter?: {
      status?: ScheduledReportStatus;
      reportType?: ScheduledReportType;
      frequency?: ScheduledReportFrequency;
    }
  ) {
    const where: Prisma.ScheduledReportWhereInput = {
      familyId,
      ...(filter?.status && { status: filter.status }),
      ...(filter?.reportType && { reportType: filter.reportType }),
      ...(filter?.frequency && { frequency: filter.frequency }),
    };

    return prisma.scheduledReport.findMany({
      where,
      include: {
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getScheduledReportById(familyId: string, reportId: string) {
    return prisma.scheduledReport.findFirst({
      where: {
        id: reportId,
        familyId,
      },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 10, // Last 10 executions
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
    });
  }

  static async createScheduledReport(
    familyId: string,
    userId: string,
    data: CreateScheduledReportData
  ) {
    // Verify user permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canViewReports) {
      throw new Error('Insufficient permissions to create scheduled reports');
    }

    // Validate recipients are valid email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of data.recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Validate delivery schedule parameters
    this.validateDeliverySchedule(data.frequency, data.deliveryDay, data.deliveryHour);

    // Calculate next execution time
    const nextExecution = this.calculateNextExecution(
      data.frequency,
      data.deliveryDay || this.getDefaultDeliveryDay(data.frequency),
      data.deliveryHour || 9, // Default to 9 AM
      data.timezone || 'UTC',
      data.startDate
    );

    return prisma.scheduledReport.create({
      data: {
        familyId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        reportType: data.reportType,
        frequency: data.frequency,
        recipients: data.recipients,
        parameters: data.parameters || {},
        timezone: data.timezone || 'UTC',
        deliveryDay: data.deliveryDay || this.getDefaultDeliveryDay(data.frequency),
        deliveryHour: data.deliveryHour || 9,
        status: 'active',
        nextExecution,
        lastExecution: null,
      },
    });
  }

  static async updateScheduledReport(
    familyId: string,
    reportId: string,
    userId: string,
    data: UpdateScheduledReportData
  ) {
    // Verify permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canViewReports) {
      throw new Error('Insufficient permissions to update scheduled reports');
    }

    // Verify report exists
    const report = await this.getScheduledReportById(familyId, reportId);
    if (!report) {
      throw new Error('Scheduled report not found');
    }

    // Validate email addresses if provided
    if (data.recipients) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of data.recipients) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }
    }

    // Build update data
    const updateData: Prisma.ScheduledReportUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.recipients !== undefined) updateData.recipients = data.recipients;
    if (data.parameters !== undefined) updateData.parameters = data.parameters;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    // Handle frequency/schedule changes
    if (data.frequency || data.deliveryDay !== undefined || data.deliveryHour !== undefined) {
      const newFrequency = data.frequency || report.frequency;
      const newDeliveryDay = data.deliveryDay !== undefined ? data.deliveryDay : report.deliveryDay;
      const newDeliveryHour = data.deliveryHour !== undefined ? data.deliveryHour : report.deliveryHour;
      const newTimezone = data.timezone || report.timezone;

      // Validate new schedule
      this.validateDeliverySchedule(newFrequency, newDeliveryDay, newDeliveryHour);

      // Recalculate next execution
      const nextExecution = this.calculateNextExecution(
        newFrequency,
        newDeliveryDay,
        newDeliveryHour,
        newTimezone
      );

      updateData.frequency = newFrequency;
      updateData.deliveryDay = newDeliveryDay;
      updateData.deliveryHour = newDeliveryHour;
      updateData.nextExecution = nextExecution;
    }

    return prisma.scheduledReport.update({
      where: { id: reportId },
      data: updateData,
    });
  }

  static async deleteScheduledReport(familyId: string, reportId: string, userId: string): Promise<void> {
    // Verify permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canViewReports) {
      throw new Error('Insufficient permissions to delete scheduled reports');
    }

    // Verify report exists
    const report = await this.getScheduledReportById(familyId, reportId);
    if (!report) {
      throw new Error('Scheduled report not found');
    }

    await prisma.$transaction(async (tx) => {
      // Delete executions first (foreign key constraint)
      await tx.scheduledReportExecution.deleteMany({
        where: { scheduledReportId: reportId },
      });

      // Delete the scheduled report
      await tx.scheduledReport.delete({
        where: { id: reportId },
      });
    });
  }

  static async executeScheduledReport(reportId: string): Promise<ScheduledReportExecution> {
    const report = await prisma.scheduledReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Scheduled report not found');
    }

    if (report.status !== 'active') {
      throw new Error('Scheduled report is not active');
    }

    // Create execution record
    const execution = await prisma.scheduledReportExecution.create({
      data: {
        scheduledReportId: reportId,
        status: 'running',
        deliveryStatus: 'pending',
      },
    });

    try {
      // Generate the report data
      const reportData = await this.generateReportData(report);

      // Update execution with report data
      await prisma.scheduledReportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          reportData,
        },
      });

      // Send the report to recipients
      await this.deliverReport(execution.id, report, reportData);

      // Update next execution time
      const nextExecution = this.calculateNextExecution(
        report.frequency,
        report.deliveryDay,
        report.deliveryHour,
        report.timezone
      );

      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: {
          lastExecution: new Date(),
          nextExecution,
        },
      });

      return {
        id: execution.id,
        scheduledReportId: reportId,
        executedAt: execution.executedAt,
        status: 'completed',
        reportData,
        deliveryStatus: 'sent',
      };

    } catch (error) {
      // Update execution with error
      await prisma.scheduledReportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: error.message,
          deliveryStatus: 'failed',
          deliveryError: error.message,
        },
      });

      // Update report status to error
      await prisma.scheduledReport.update({
        where: { id: reportId },
        data: { status: 'error' },
      });

      throw error;
    }
  }

  static async getDueReports(): Promise<any[]> {
    const now = new Date();

    return prisma.scheduledReport.findMany({
      where: {
        status: 'active',
        nextExecution: {
          lte: now,
        },
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });
  }

  static async getReportExecutionHistory(
    familyId: string,
    reportId: string,
    limit: number = 50
  ): Promise<ScheduledReportExecution[]> {
    const report = await this.getScheduledReportById(familyId, reportId);
    if (!report) {
      throw new Error('Scheduled report not found');
    }

    const executions = await prisma.scheduledReportExecution.findMany({
      where: { scheduledReportId: reportId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });

    return executions.map(execution => ({
      id: execution.id,
      scheduledReportId: execution.scheduledReportId,
      executedAt: execution.executedAt,
      status: execution.status as 'pending' | 'running' | 'completed' | 'failed',
      reportData: execution.reportData,
      error: execution.error || undefined,
      deliveryStatus: execution.deliveryStatus as 'pending' | 'sent' | 'failed',
      deliveryError: execution.deliveryError || undefined,
    }));
  }

  private static async generateReportData(report: any): Promise<any> {
    const familyId = report.familyId;
    const parameters = report.parameters || {};

    // Calculate date range based on frequency and parameters
    const dateRange = this.calculateReportDateRange(report.frequency, parameters);

    switch (report.reportType) {
      case 'cash_flow':
        return ReportsService.generateCashFlowReport(
          familyId,
          dateRange,
          parameters.groupBy || 'month',
          parameters.includeProjections || false
        );

      case 'spending_analysis':
        return ReportsService.generateSpendingAnalysis(familyId, dateRange);

      case 'budget_performance':
        return ReportsService.generateBudgetPerformance(familyId, dateRange);

      case 'income_analysis':
        return ReportsService.generateIncomeAnalysis(familyId, dateRange);

      case 'net_worth':
        return ReportsService.generateNetWorthReport(familyId);

      case 'savings_rate':
        return ReportsService.generateSavingsRateReport(
          familyId,
          dateRange,
          parameters.targetSavingsRate || 20
        );

      case 'monthly_summary':
        const summaryMonth = parameters.month ? new Date(parameters.month) : new Date();
        return ReportsService.generateMonthlySummary(familyId, summaryMonth);

      case 'annual_summary':
        // Generate comprehensive annual report (combination of multiple reports)
        const [cashFlow, spending, budget, income, savings] = await Promise.all([
          ReportsService.generateCashFlowReport(familyId, dateRange),
          ReportsService.generateSpendingAnalysis(familyId, dateRange),
          ReportsService.generateBudgetPerformance(familyId, dateRange),
          ReportsService.generateIncomeAnalysis(familyId, dateRange),
          ReportsService.generateSavingsRateReport(familyId, dateRange),
        ]);

        return {
          type: 'annual_summary',
          year: dateRange.fromDate.getFullYear(),
          cashFlow,
          spending,
          budget,
          income,
          savings,
          generatedAt: new Date(),
        };

      default:
        throw new Error(`Unsupported report type: ${report.reportType}`);
    }
  }

  private static async deliverReport(executionId: string, report: any, reportData: any): Promise<void> {
    // This would integrate with EmailService to send the report
    // For now, just mark as sent
    await prisma.scheduledReportExecution.update({
      where: { id: executionId },
      data: { deliveryStatus: 'sent' },
    });

    // TODO: Implement actual email delivery
    console.log(`Report delivered for ${report.name} to ${report.recipients.join(', ')}`);
  }

  private static calculateReportDateRange(
    frequency: ScheduledReportFrequency,
    parameters: Record<string, any>
  ): { fromDate: Date; toDate: Date } {
    const now = new Date();
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); // Yesterday

    let fromDate: Date;

    switch (frequency) {
      case 'weekly':
        fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - 7);
        break;

      case 'monthly':
        fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
        break;

      case 'quarterly':
        const quarter = Math.floor(toDate.getMonth() / 3);
        fromDate = new Date(toDate.getFullYear(), quarter * 3, 1);
        break;

      case 'annual':
        fromDate = new Date(toDate.getFullYear(), 0, 1);
        break;

      default:
        // Default to last 30 days
        fromDate = new Date(toDate);
        fromDate.setDate(fromDate.getDate() - 30);
    }

    // Allow parameter override
    if (parameters.fromDate) fromDate = new Date(parameters.fromDate);
    if (parameters.toDate) toDate = new Date(parameters.toDate);

    return { fromDate, toDate };
  }

  private static calculateNextExecution(
    frequency: ScheduledReportFrequency,
    deliveryDay: number,
    deliveryHour: number,
    timezone: string,
    startDate?: Date
  ): Date {
    const now = startDate || new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'weekly':
        // deliveryDay is day of week (0 = Sunday, 6 = Saturday)
        const currentDay = next.getDay();
        const daysUntilDelivery = (deliveryDay - currentDay + 7) % 7;
        next.setDate(next.getDate() + (daysUntilDelivery === 0 ? 7 : daysUntilDelivery));
        break;

      case 'monthly':
        // deliveryDay is day of month (1-31)
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(deliveryDay, this.getDaysInMonth(next.getFullYear(), next.getMonth())));
        break;

      case 'quarterly':
        // First day of next quarter
        const currentQuarter = Math.floor(next.getMonth() / 3);
        next.setMonth((currentQuarter + 1) * 3);
        next.setDate(1);
        break;

      case 'annual':
        // First day of next year
        next.setFullYear(next.getFullYear() + 1);
        next.setMonth(0);
        next.setDate(1);
        break;
    }

    next.setHours(deliveryHour, 0, 0, 0);
    return next;
  }

  private static validateDeliverySchedule(
    frequency: ScheduledReportFrequency,
    deliveryDay?: number,
    deliveryHour?: number
  ): void {
    if (deliveryHour !== undefined && (deliveryHour < 0 || deliveryHour > 23)) {
      throw new Error('Delivery hour must be between 0 and 23');
    }

    if (deliveryDay !== undefined) {
      switch (frequency) {
        case 'weekly':
          if (deliveryDay < 0 || deliveryDay > 6) {
            throw new Error('For weekly reports, delivery day must be between 0 (Sunday) and 6 (Saturday)');
          }
          break;
        case 'monthly':
          if (deliveryDay < 1 || deliveryDay > 31) {
            throw new Error('For monthly reports, delivery day must be between 1 and 31');
          }
          break;
        case 'quarterly':
        case 'annual':
          // No specific day validation needed
          break;
      }
    }
  }

  private static getDefaultDeliveryDay(frequency: ScheduledReportFrequency): number {
    switch (frequency) {
      case 'weekly': return 1; // Monday
      case 'monthly': return 1; // 1st of the month
      case 'quarterly': return 1; // 1st of the quarter
      case 'annual': return 1; // 1st of the year
      default: return 1;
    }
  }

  private static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
}

// For cron job or scheduled task integration
export async function processScheduledReports(): Promise<void> {
  const dueReports = await ScheduledReportService.getDueReports();

  for (const report of dueReports) {
    try {
      await ScheduledReportService.executeScheduledReport(report.id);
    } catch (error) {
      console.error(`Failed to execute scheduled report ${report.id}:`, error);
    }
  }
}