import { prisma } from '../lib/prisma';
import { ReportsService } from './reports.service';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as csv from 'csv-stringify';

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';

export type ExportType =
  | 'transactions'
  | 'payments'
  | 'income_events'
  | 'budget_allocations'
  | 'reports'
  | 'all_data';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CreateExportData = {
  exportType: ExportType;
  format: ExportFormat;
  dateRange?: {
    fromDate: Date;
    toDate: Date;
  };
  filters?: Record<string, any>;
  includeCharts?: boolean;
  reportType?: string; // For report exports
  reportParameters?: Record<string, any>;
  email?: string; // Email to send download link
};

export type ExportJob = {
  id: string;
  familyId: string;
  userId: string;
  exportType: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  progress: number; // 0-100
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  estimatedCompletionTime?: Date;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  parameters: Record<string, any>;
};

export class ExportService {
  private static readonly EXPORT_DIR = process.env.EXPORT_DIR || './exports';
  private static readonly EXPORT_URL_BASE = process.env.EXPORT_URL_BASE || '/api/exports';
  private static readonly EXPORT_TTL_HOURS = 24; // Files expire after 24 hours

  static async createExport(
    familyId: string,
    userId: string,
    data: CreateExportData
  ): Promise<ExportJob> {
    // Verify user permissions
    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
    });

    if (!user || user.familyId !== familyId) {
      throw new Error('User not found or not authorized');
    }

    if (!user.permissions.canViewReports) {
      throw new Error('Insufficient permissions to export data');
    }

    // Validate export parameters
    this.validateExportParameters(data);

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        familyId,
        userId,
        exportType: data.exportType,
        format: data.format,
        status: 'pending',
        progress: 0,
        estimatedCompletionTime: this.calculateEstimatedCompletion(data.exportType, data.format),
        expiresAt: new Date(Date.now() + this.EXPORT_TTL_HOURS * 60 * 60 * 1000),
        parameters: {
          dateRange: data.dateRange,
          filters: data.filters,
          includeCharts: data.includeCharts,
          reportType: data.reportType,
          reportParameters: data.reportParameters,
          email: data.email,
        },
      },
    });

    // Start export processing asynchronously
    this.processExport(exportJob.id).catch(error => {
      console.error(`Export ${exportJob.id} failed:`, error);
    });

    return {
      id: exportJob.id,
      familyId: exportJob.familyId,
      userId: exportJob.userId,
      exportType: exportJob.exportType as ExportType,
      format: exportJob.format as ExportFormat,
      status: exportJob.status as ExportStatus,
      progress: exportJob.progress,
      estimatedCompletionTime: exportJob.estimatedCompletionTime || undefined,
      createdAt: exportJob.createdAt,
      expiresAt: exportJob.expiresAt,
      parameters: exportJob.parameters as Record<string, any>,
    };
  }

  static async getExportJobs(
    familyId: string,
    userId: string,
    limit: number = 50
  ): Promise<ExportJob[]> {
    const jobs = await prisma.exportJob.findMany({
      where: {
        familyId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map(job => ({
      id: job.id,
      familyId: job.familyId,
      userId: job.userId,
      exportType: job.exportType as ExportType,
      format: job.format as ExportFormat,
      status: job.status as ExportStatus,
      progress: job.progress,
      filePath: job.filePath || undefined,
      downloadUrl: job.downloadUrl || undefined,
      error: job.error || undefined,
      estimatedCompletionTime: job.estimatedCompletionTime || undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt || undefined,
      expiresAt: job.expiresAt,
      parameters: job.parameters as Record<string, any>,
    }));
  }

  static async getExportJob(
    familyId: string,
    userId: string,
    exportId: string
  ): Promise<ExportJob | null> {
    const job = await prisma.exportJob.findFirst({
      where: {
        id: exportId,
        familyId,
        userId,
      },
    });

    if (!job) return null;

    return {
      id: job.id,
      familyId: job.familyId,
      userId: job.userId,
      exportType: job.exportType as ExportType,
      format: job.format as ExportFormat,
      status: job.status as ExportStatus,
      progress: job.progress,
      filePath: job.filePath || undefined,
      downloadUrl: job.downloadUrl || undefined,
      error: job.error || undefined,
      estimatedCompletionTime: job.estimatedCompletionTime || undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt || undefined,
      expiresAt: job.expiresAt,
      parameters: job.parameters as Record<string, any>,
    };
  }

  static async deleteExport(
    familyId: string,
    userId: string,
    exportId: string
  ): Promise<void> {
    const job = await this.getExportJob(familyId, userId, exportId);
    if (!job) {
      throw new Error('Export job not found');
    }

    // Delete file if exists
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch (error) {
        console.warn(`Failed to delete export file ${job.filePath}:`, error);
      }
    }

    // Delete database record
    await prisma.exportJob.delete({
      where: { id: exportId },
    });
  }

  private static async processExport(exportId: string): Promise<void> {
    // Update status to processing
    await prisma.exportJob.update({
      where: { id: exportId },
      data: { status: 'processing', progress: 0 },
    });

    try {
      const job = await prisma.exportJob.findUnique({
        where: { id: exportId },
      });

      if (!job) {
        throw new Error('Export job not found');
      }

      const parameters = job.parameters as Record<string, any>;

      // Generate filename and path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${job.exportType}-${timestamp}.${this.getFileExtension(job.format as ExportFormat)}`;
      const filePath = path.join(this.EXPORT_DIR, filename);

      // Ensure export directory exists
      await fs.mkdir(this.EXPORT_DIR, { recursive: true });

      // Update progress
      await this.updateProgress(exportId, 10);

      // Export data based on type
      await this.exportData(
        job.familyId,
        job.exportType as ExportType,
        job.format as ExportFormat,
        filePath,
        parameters,
        (progress) => this.updateProgress(exportId, Math.max(10, progress))
      );

      // Generate download URL
      const downloadUrl = `${this.EXPORT_URL_BASE}/${filename}`;

      // Update job as completed
      await prisma.exportJob.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          progress: 100,
          filePath,
          downloadUrl,
          completedAt: new Date(),
        },
      });

      // Send email if requested
      if (parameters.email) {
        await this.sendDownloadEmail(parameters.email, downloadUrl, job);
      }

    } catch (error) {
      // Update job as failed
      await prisma.exportJob.update({
        where: { id: exportId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private static async exportData(
    familyId: string,
    exportType: ExportType,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    switch (exportType) {
      case 'transactions':
        await this.exportTransactions(familyId, format, filePath, parameters, onProgress);
        break;

      case 'payments':
        await this.exportPayments(familyId, format, filePath, parameters, onProgress);
        break;

      case 'income_events':
        await this.exportIncomeEvents(familyId, format, filePath, parameters, onProgress);
        break;

      case 'budget_allocations':
        await this.exportBudgetAllocations(familyId, format, filePath, parameters, onProgress);
        break;

      case 'reports':
        await this.exportReport(familyId, format, filePath, parameters, onProgress);
        break;

      case 'all_data':
        await this.exportAllData(familyId, format, filePath, parameters, onProgress);
        break;

      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }
  }

  private static async exportTransactions(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    await onProgress(20);

    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { familyId },
        ...(parameters.dateRange && {
          date: {
            gte: new Date(parameters.dateRange.fromDate),
            lte: new Date(parameters.dateRange.toDate),
          },
        }),
        ...(parameters.filters?.categoryId && {
          spendingCategoryId: parameters.filters.categoryId,
        }),
        ...(parameters.filters?.bankAccountId && {
          bankAccountId: parameters.filters.bankAccountId,
        }),
      },
      include: {
        spendingCategory: {
          select: { name: true, icon: true, color: true },
        },
        bankAccount: {
          select: { accountName: true, institutionName: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    await onProgress(70);

    const exportData = transactions.map(txn => ({
      id: txn.id,
      date: txn.date.toISOString().split('T')[0],
      description: txn.description,
      merchant: txn.merchantName || '',
      amount: Number(txn.amount),
      category: txn.spendingCategory?.name || 'Uncategorized',
      account: txn.bankAccount.accountName,
      institution: txn.bankAccount.institutionName,
      pending: txn.pending ? 'Yes' : 'No',
      userCategorized: txn.userCategorized ? 'Yes' : 'No',
      notes: txn.notes || '',
    }));

    await onProgress(90);

    if (format === 'csv') {
      await this.writeCSV(filePath, exportData);
    } else {
      await this.writeJSON(filePath, exportData);
    }

    await onProgress(100);
  }

  private static async exportPayments(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    await onProgress(20);

    const payments = await prisma.payment.findMany({
      where: {
        familyId,
        ...(parameters.dateRange && {
          dueDate: {
            gte: new Date(parameters.dateRange.fromDate),
            lte: new Date(parameters.dateRange.toDate),
          },
        }),
        ...(parameters.filters?.status && {
          status: parameters.filters.status,
        }),
        ...(parameters.filters?.categoryId && {
          spendingCategoryId: parameters.filters.categoryId,
        }),
      },
      include: {
        spendingCategory: {
          select: { name: true },
        },
        attributions: {
          include: {
            incomeEvent: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    await onProgress(70);

    const exportData = payments.map(payment => ({
      id: payment.id,
      payee: payment.payee,
      amount: Number(payment.amount),
      dueDate: payment.dueDate.toISOString().split('T')[0],
      paidDate: payment.paidDate ? payment.paidDate.toISOString().split('T')[0] : '',
      paidAmount: payment.paidAmount ? Number(payment.paidAmount) : '',
      status: payment.status,
      frequency: payment.frequency,
      category: payment.spendingCategory?.name || 'Uncategorized',
      autoPayEnabled: payment.autoPayEnabled ? 'Yes' : 'No',
      attributions: payment.attributions.map(attr =>
        `${attr.incomeEvent.name}: $${Number(attr.amount)}`
      ).join('; '),
      notes: payment.notes || '',
    }));

    await onProgress(90);

    if (format === 'csv') {
      await this.writeCSV(filePath, exportData);
    } else {
      await this.writeJSON(filePath, exportData);
    }

    await onProgress(100);
  }

  private static async exportIncomeEvents(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    await onProgress(20);

    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        ...(parameters.dateRange && {
          scheduledDate: {
            gte: new Date(parameters.dateRange.fromDate),
            lte: new Date(parameters.dateRange.toDate),
          },
        }),
      },
      include: {
        attributions: {
          include: {
            payment: {
              select: { payee: true },
            },
          },
        },
        allocations: {
          include: {
            budgetCategory: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    await onProgress(70);

    const exportData = incomeEvents.map(income => ({
      id: income.id,
      name: income.name,
      amount: Number(income.amount),
      scheduledDate: income.scheduledDate.toISOString().split('T')[0],
      actualDate: income.actualDate ? income.actualDate.toISOString().split('T')[0] : '',
      actualAmount: income.actualAmount ? Number(income.actualAmount) : '',
      frequency: income.frequency,
      status: income.status,
      source: income.source || '',
      allocatedAmount: Number(income.allocatedAmount || 0),
      remainingAmount: Number(income.remainingAmount || 0),
      budgetAllocations: income.allocations.map(alloc =>
        `${alloc.budgetCategory.name}: $${Number(alloc.amount)}`
      ).join('; '),
      paymentAttributions: income.attributions.map(attr =>
        `${attr.payment.payee}: $${Number(attr.amount)}`
      ).join('; '),
      notes: income.notes || '',
    }));

    await onProgress(90);

    if (format === 'csv') {
      await this.writeCSV(filePath, exportData);
    } else {
      await this.writeJSON(filePath, exportData);
    }

    await onProgress(100);
  }

  private static async exportBudgetAllocations(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    await onProgress(20);

    const allocations = await prisma.budgetAllocation.findMany({
      where: {
        incomeEvent: { familyId },
        ...(parameters.dateRange && {
          incomeEvent: {
            scheduledDate: {
              gte: new Date(parameters.dateRange.fromDate),
              lte: new Date(parameters.dateRange.toDate),
            },
          },
        }),
      },
      include: {
        budgetCategory: true,
        incomeEvent: {
          select: {
            name: true,
            scheduledDate: true,
            amount: true,
          },
        },
      },
      orderBy: {
        incomeEvent: { scheduledDate: 'desc' },
      },
    });

    await onProgress(70);

    const exportData = allocations.map(alloc => ({
      id: alloc.id,
      incomeEventName: alloc.incomeEvent.name,
      incomeEventDate: alloc.incomeEvent.scheduledDate.toISOString().split('T')[0],
      incomeEventAmount: Number(alloc.incomeEvent.amount),
      budgetCategory: alloc.budgetCategory.name,
      budgetCategoryPercentage: Number(alloc.budgetCategory.targetPercentage),
      allocatedAmount: Number(alloc.amount),
      allocatedPercentage: Number(alloc.percentage),
      createdAt: alloc.createdAt.toISOString(),
    }));

    await onProgress(90);

    if (format === 'csv') {
      await this.writeCSV(filePath, exportData);
    } else {
      await this.writeJSON(filePath, exportData);
    }

    await onProgress(100);
  }

  private static async exportReport(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    await onProgress(30);

    if (!parameters.reportType) {
      throw new Error('Report type is required for report exports');
    }

    // Generate report data using ReportsService
    let reportData: any;
    const dateRange = parameters.dateRange || {
      fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      toDate: new Date(),
    };

    await onProgress(50);

    switch (parameters.reportType) {
      case 'cash_flow':
        reportData = await ReportsService.generateCashFlowReport(familyId, dateRange);
        break;
      case 'spending_analysis':
        reportData = await ReportsService.generateSpendingAnalysis(familyId, dateRange);
        break;
      case 'budget_performance':
        reportData = await ReportsService.generateBudgetPerformance(familyId, dateRange);
        break;
      case 'income_analysis':
        reportData = await ReportsService.generateIncomeAnalysis(familyId, dateRange);
        break;
      default:
        throw new Error(`Unsupported report type: ${parameters.reportType}`);
    }

    await onProgress(80);

    if (format === 'csv') {
      // Flatten complex report data for CSV export
      const flattenedData = this.flattenReportData(reportData, parameters.reportType);
      await this.writeCSV(filePath, flattenedData);
    } else {
      await this.writeJSON(filePath, reportData);
    }

    await onProgress(100);
  }

  private static async exportAllData(
    familyId: string,
    format: ExportFormat,
    filePath: string,
    parameters: Record<string, any>,
    onProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    // Export all family data (transactions, payments, income, etc.)
    const allData: Record<string, any> = {};

    // Transactions (25%)
    await onProgress(10);
    allData.transactions = await prisma.transaction.findMany({
      where: { bankAccount: { familyId } },
      include: {
        spendingCategory: true,
        bankAccount: true,
      },
    });

    // Payments (50%)
    await onProgress(35);
    allData.payments = await prisma.payment.findMany({
      where: { familyId },
      include: {
        spendingCategory: true,
        attributions: {
          include: { incomeEvent: true },
        },
      },
    });

    // Income Events (75%)
    await onProgress(60);
    allData.incomeEvents = await prisma.incomeEvent.findMany({
      where: { familyId },
      include: {
        attributions: true,
        allocations: {
          include: { budgetCategory: true },
        },
      },
    });

    // Family and configuration data (100%)
    await onProgress(85);
    allData.family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        familyMembers: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            permissions: true,
            createdAt: true,
          },
        },
        budgetCategories: true,
        spendingCategories: true,
        bankAccounts: true,
      },
    });

    await onProgress(95);

    if (format === 'json') {
      await this.writeJSON(filePath, allData);
    } else {
      throw new Error('All data export only supports JSON format');
    }

    await onProgress(100);
  }

  private static async writeCSV(filePath: string, data: any[]): Promise<void> {
    if (data.length === 0) {
      await fs.writeFile(filePath, 'No data available');
      return;
    }

    return new Promise((resolve, reject) => {
      const stringifier = csv.stringify({
        header: true,
        columns: Object.keys(data[0]),
      });

      const writeStream = createWriteStream(filePath);
      stringifier.pipe(writeStream);

      stringifier.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('close', resolve);

      data.forEach(row => stringifier.write(row));
      stringifier.end();
    });
  }

  private static async writeJSON(filePath: string, data: any): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString);
  }

  private static flattenReportData(reportData: any, reportType: string): any[] {
    // Flatten complex nested report data for CSV export
    switch (reportType) {
      case 'cash_flow':
        return Array.isArray(reportData) ? reportData.map(period => ({
          period: period.period,
          totalIncome: period.totalIncome,
          totalExpenses: period.totalExpenses,
          netCashFlow: period.netCashFlow,
        })) : [];

      case 'spending_analysis':
        return reportData.categoryBreakdown || [];

      case 'budget_performance':
        return reportData.categoryPerformance || [];

      default:
        return Array.isArray(reportData) ? reportData : [reportData];
    }
  }

  private static validateExportParameters(data: CreateExportData): void {
    const supportedFormats: ExportFormat[] = ['csv', 'json', 'pdf', 'excel'];
    if (!supportedFormats.includes(data.format)) {
      throw new Error(`Unsupported export format: ${data.format}`);
    }

    if (data.exportType === 'reports' && !data.reportType) {
      throw new Error('Report type is required for report exports');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Invalid email address');
    }
  }

  private static calculateEstimatedCompletion(exportType: ExportType, format: ExportFormat): Date {
    const now = new Date();
    let estimatedMinutes = 5; // Base time

    // Adjust based on export complexity
    switch (exportType) {
      case 'transactions': estimatedMinutes = 3; break;
      case 'payments': estimatedMinutes = 2; break;
      case 'income_events': estimatedMinutes = 2; break;
      case 'budget_allocations': estimatedMinutes = 2; break;
      case 'reports': estimatedMinutes = 5; break;
      case 'all_data': estimatedMinutes = 10; break;
    }

    // PDF takes longer than CSV/JSON
    if (format === 'pdf' || format === 'excel') {
      estimatedMinutes *= 1.5;
    }

    return new Date(now.getTime() + estimatedMinutes * 60 * 1000);
  }

  private static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'csv': return 'csv';
      case 'json': return 'json';
      case 'pdf': return 'pdf';
      case 'excel': return 'xlsx';
      default: return 'json';
    }
  }

  private static async updateProgress(exportId: string, progress: number): Promise<void> {
    await prisma.exportJob.update({
      where: { id: exportId },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }

  private static async sendDownloadEmail(email: string, downloadUrl: string, job: any): Promise<void> {
    // TODO: Integrate with EmailService
    console.log(`Email would be sent to ${email} with download link: ${downloadUrl}`);
  }

  // Cleanup expired exports (run via cron job)
  static async cleanupExpiredExports(): Promise<void> {
    const expiredJobs = await prisma.exportJob.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    for (const job of expiredJobs) {
      if (job.filePath) {
        try {
          await fs.unlink(job.filePath);
        } catch (error) {
          console.warn(`Failed to delete expired export file ${job.filePath}:`, error);
        }
      }
    }

    await prisma.exportJob.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    console.log(`Cleaned up ${expiredJobs.length} expired export jobs`);
  }
}