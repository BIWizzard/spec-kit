import { ExportService, CreateExportData, ExportFormat, ExportType, ExportStatus } from '../../backend/src/services/export.service';
import { ReportsService } from '../../backend/src/services/reports.service';
import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import * as path from 'path';

// Mock external dependencies
jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('csv-stringify', () => ({
  stringify: jest.fn(),
}));

jest.mock('../../backend/src/services/reports.service');

// Mock Prisma
const mockPrisma = {
  familyMember: {
    findUnique: jest.fn(),
  },
  exportJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
  incomeEvent: {
    findMany: jest.fn(),
  },
  budgetAllocation: {
    findMany: jest.fn(),
  },
  family: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Add prisma to global scope
global.prisma = mockPrisma as any;

const mockfs = fs as jest.Mocked<typeof fs>;
const mockCreateWriteStream = createWriteStream as jest.MockedFunction<typeof createWriteStream>;
const mockStringify = require('csv-stringify').stringify as jest.MockedFunction<any>;
const mockReportsService = ReportsService as jest.Mocked<typeof ReportsService>;

describe('ExportService', () => {
  const mockFamilyId = 'family-123';
  const mockUserId = 'user-123';

  const mockUser = {
    id: mockUserId,
    familyId: mockFamilyId,
    permissions: {
      canViewReports: true,
    },
  };

  const mockExportJob = {
    id: 'export-123',
    familyId: mockFamilyId,
    userId: mockUserId,
    exportType: 'transactions',
    format: 'csv',
    status: 'pending',
    progress: 0,
    filePath: null,
    downloadUrl: null,
    error: null,
    estimatedCompletionTime: new Date('2024-01-01T12:05:00Z'),
    createdAt: new Date('2024-01-01T12:00:00Z'),
    completedAt: null,
    expiresAt: new Date('2024-01-02T12:00:00Z'),
    parameters: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default environment
    process.env.EXPORT_DIR = './test-exports';
    process.env.EXPORT_URL_BASE = '/api/test-exports';

    mockPrisma.familyMember.findUnique.mockResolvedValue(mockUser as any);
    mockPrisma.exportJob.create.mockResolvedValue(mockExportJob as any);
    mockfs.mkdir.mockResolvedValue(undefined as any);
    mockfs.writeFile.mockResolvedValue(undefined);
    mockfs.unlink.mockResolvedValue(undefined);

    // Mock stream for CSV writing
    const mockStream = {
      pipe: jest.fn(),
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
    mockCreateWriteStream.mockReturnValue(mockStream as any);
    mockStringify.mockReturnValue(mockStream);
  });

  afterEach(() => {
    delete global.prisma;
  });

  describe('createExport', () => {
    const mockCreateData: CreateExportData = {
      exportType: 'transactions',
      format: 'csv',
      dateRange: {
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
      },
      filters: { categoryId: 'cat-123' },
    };

    it('should create export job successfully', async () => {
      const result = await ExportService.createExport(mockFamilyId, mockUserId, mockCreateData);

      expect(mockPrisma.familyMember.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });

      expect(mockPrisma.exportJob.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          userId: mockUserId,
          exportType: 'transactions',
          format: 'csv',
          status: 'pending',
          progress: 0,
          estimatedCompletionTime: expect.any(Date),
          expiresAt: expect.any(Date),
          parameters: {
            dateRange: mockCreateData.dateRange,
            filters: mockCreateData.filters,
            includeCharts: undefined,
            reportType: undefined,
            reportParameters: undefined,
            email: undefined,
          },
        },
      });

      expect(result.id).toBe('export-123');
      expect(result.status).toBe('pending');
    });

    it('should throw error when user not found', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, mockCreateData)
      ).rejects.toThrow('User not found or not authorized');
    });

    it('should throw error when user not in family', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({
        ...mockUser,
        familyId: 'other-family',
      } as any);

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, mockCreateData)
      ).rejects.toThrow('User not found or not authorized');
    });

    it('should throw error when user lacks permissions', async () => {
      mockPrisma.familyMember.findUnique.mockResolvedValue({
        ...mockUser,
        permissions: { canViewReports: false },
      } as any);

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, mockCreateData)
      ).rejects.toThrow('Insufficient permissions to export data');
    });

    it('should validate unsupported export format', async () => {
      const invalidData = { ...mockCreateData, format: 'invalid' as ExportFormat };

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, invalidData)
      ).rejects.toThrow('Unsupported export format: invalid');
    });

    it('should validate report type required for report exports', async () => {
      const reportData = { ...mockCreateData, exportType: 'reports' as ExportType };

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, reportData)
      ).rejects.toThrow('Report type is required for report exports');
    });

    it('should validate invalid email address', async () => {
      const emailData = { ...mockCreateData, email: 'invalid-email' };

      await expect(
        ExportService.createExport(mockFamilyId, mockUserId, emailData)
      ).rejects.toThrow('Invalid email address');
    });

    it('should accept valid email address', async () => {
      const emailData = { ...mockCreateData, email: 'test@example.com' };

      const result = await ExportService.createExport(mockFamilyId, mockUserId, emailData);

      expect(mockPrisma.exportJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parameters: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      });
      expect(result).toBeDefined();
    });

    it('should calculate estimated completion time correctly', async () => {
      const beforeCreate = Date.now();

      await ExportService.createExport(mockFamilyId, mockUserId, mockCreateData);

      const createCall = mockPrisma.exportJob.create.mock.calls[0][0];
      const estimatedTime = createCall.data.estimatedCompletionTime;
      const afterCreate = Date.now();

      // Should be within 3-4 minutes from now (transactions = 3 min)
      const estimatedMs = estimatedTime.getTime();
      const expectedMin = beforeCreate + 2.5 * 60 * 1000;
      const expectedMax = afterCreate + 3.5 * 60 * 1000;

      expect(estimatedMs).toBeGreaterThan(expectedMin);
      expect(estimatedMs).toBeLessThan(expectedMax);
    });

    it('should set expiration to 24 hours from now', async () => {
      const beforeCreate = Date.now();

      await ExportService.createExport(mockFamilyId, mockUserId, mockCreateData);

      const createCall = mockPrisma.exportJob.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;

      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000; // 24 hours
      const tolerance = 1000; // 1 second tolerance

      expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(tolerance);
    });
  });

  describe('getExportJobs', () => {
    const mockJobs = [
      { ...mockExportJob, id: 'job-1', createdAt: new Date('2024-01-02') },
      { ...mockExportJob, id: 'job-2', createdAt: new Date('2024-01-01') },
    ];

    beforeEach(() => {
      mockPrisma.exportJob.findMany.mockResolvedValue(mockJobs as any);
    });

    it('should get export jobs for family and user', async () => {
      const result = await ExportService.getExportJobs(mockFamilyId, mockUserId);

      expect(mockPrisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { familyId: mockFamilyId, userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job-1');
    });

    it('should use custom limit', async () => {
      await ExportService.getExportJobs(mockFamilyId, mockUserId, 25);

      expect(mockPrisma.exportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 })
      );
    });

    it('should map job fields correctly', async () => {
      const result = await ExportService.getExportJobs(mockFamilyId, mockUserId);

      expect(result[0]).toEqual({
        id: 'job-1',
        familyId: mockFamilyId,
        userId: mockUserId,
        exportType: 'transactions',
        format: 'csv',
        status: 'pending',
        progress: 0,
        filePath: undefined,
        downloadUrl: undefined,
        error: undefined,
        estimatedCompletionTime: expect.any(Date),
        createdAt: expect.any(Date),
        completedAt: undefined,
        expiresAt: expect.any(Date),
        parameters: {},
      });
    });
  });

  describe('getExportJob', () => {
    beforeEach(() => {
      mockPrisma.exportJob.findFirst.mockResolvedValue(mockExportJob as any);
    });

    it('should get specific export job', async () => {
      const result = await ExportService.getExportJob(mockFamilyId, mockUserId, 'export-123');

      expect(mockPrisma.exportJob.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'export-123',
          familyId: mockFamilyId,
          userId: mockUserId,
        },
      });

      expect(result?.id).toBe('export-123');
    });

    it('should return null when job not found', async () => {
      mockPrisma.exportJob.findFirst.mockResolvedValue(null);

      const result = await ExportService.getExportJob(mockFamilyId, mockUserId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteExport', () => {
    const mockJobWithFile = {
      ...mockExportJob,
      filePath: '/path/to/export.csv',
    };

    beforeEach(() => {
      jest.spyOn(ExportService, 'getExportJob').mockResolvedValue(mockJobWithFile);
      mockPrisma.exportJob.delete.mockResolvedValue(mockExportJob as any);
    });

    it('should delete export job and file', async () => {
      await ExportService.deleteExport(mockFamilyId, mockUserId, 'export-123');

      expect(mockfs.unlink).toHaveBeenCalledWith('/path/to/export.csv');
      expect(mockPrisma.exportJob.delete).toHaveBeenCalledWith({
        where: { id: 'export-123' },
      });
    });

    it('should handle file deletion errors gracefully', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      mockfs.unlink.mockRejectedValue(new Error('File not found'));

      await ExportService.deleteExport(mockFamilyId, mockUserId, 'export-123');

      expect(consoleWarn).toHaveBeenCalledWith(
        'Failed to delete export file /path/to/export.csv:',
        expect.any(Error)
      );
      expect(mockPrisma.exportJob.delete).toHaveBeenCalled();

      consoleWarn.mockRestore();
    });

    it('should throw error when job not found', async () => {
      jest.spyOn(ExportService, 'getExportJob').mockResolvedValue(null);

      await expect(
        ExportService.deleteExport(mockFamilyId, mockUserId, 'nonexistent')
      ).rejects.toThrow('Export job not found');
    });

    it('should delete job without file', async () => {
      jest.spyOn(ExportService, 'getExportJob').mockResolvedValue({
        ...mockExportJob,
        filePath: undefined,
      });

      await ExportService.deleteExport(mockFamilyId, mockUserId, 'export-123');

      expect(mockfs.unlink).not.toHaveBeenCalled();
      expect(mockPrisma.exportJob.delete).toHaveBeenCalled();
    });
  });

  describe('private export methods', () => {
    describe('exportTransactions', () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          date: new Date('2024-01-15'),
          description: 'Coffee Shop',
          merchantName: 'Starbucks',
          amount: 5.50,
          pending: false,
          userCategorized: true,
          notes: 'Morning coffee',
          spendingCategory: { name: 'Food & Dining', icon: '🍴', color: '#FF6B6B' },
          bankAccount: { accountName: 'Checking', institutionName: 'Chase Bank' },
        },
        {
          id: 'txn-2',
          date: new Date('2024-01-14'),
          description: 'Gas Station',
          merchantName: null,
          amount: 45.00,
          pending: false,
          userCategorized: false,
          notes: null,
          spendingCategory: null,
          bankAccount: { accountName: 'Checking', institutionName: 'Chase Bank' },
        },
      ];

      beforeEach(() => {
        mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions as any);
        jest.spyOn(ExportService as any, 'writeCSV').mockResolvedValue(undefined);
        jest.spyOn(ExportService as any, 'writeJSON').mockResolvedValue(undefined);
      });

      it('should export transactions with proper formatting', async () => {
        const mockProgress = jest.fn();

        await (ExportService as any).exportTransactions(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          {},
          mockProgress
        );

        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
          where: { bankAccount: { familyId: mockFamilyId } },
          include: {
            spendingCategory: { select: { name: true, icon: true, color: true } },
            bankAccount: { select: { accountName: true, institutionName: true } },
          },
          orderBy: { date: 'desc' },
        });

        const expectedData = [
          {
            id: 'txn-1',
            date: '2024-01-15',
            description: 'Coffee Shop',
            merchant: 'Starbucks',
            amount: 5.50,
            category: 'Food & Dining',
            account: 'Checking',
            institution: 'Chase Bank',
            pending: 'No',
            userCategorized: 'Yes',
            notes: 'Morning coffee',
          },
          {
            id: 'txn-2',
            date: '2024-01-14',
            description: 'Gas Station',
            merchant: '',
            amount: 45.00,
            category: 'Uncategorized',
            account: 'Checking',
            institution: 'Chase Bank',
            pending: 'No',
            userCategorized: 'No',
            notes: '',
          },
        ];

        expect(ExportService['writeCSV']).toHaveBeenCalledWith('/path/to/file.csv', expectedData);
        expect(mockProgress).toHaveBeenCalledWith(20);
        expect(mockProgress).toHaveBeenCalledWith(70);
        expect(mockProgress).toHaveBeenCalledWith(90);
        expect(mockProgress).toHaveBeenCalledWith(100);
      });

      it('should apply date range filter', async () => {
        const parameters = {
          dateRange: {
            fromDate: new Date('2024-01-01'),
            toDate: new Date('2024-01-31'),
          },
        };

        await (ExportService as any).exportTransactions(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          parameters,
          jest.fn()
        );

        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              date: {
                gte: new Date('2024-01-01'),
                lte: new Date('2024-01-31'),
              },
            }),
          })
        );
      });

      it('should apply category and bank account filters', async () => {
        const parameters = {
          filters: {
            categoryId: 'cat-123',
            bankAccountId: 'account-456',
          },
        };

        await (ExportService as any).exportTransactions(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          parameters,
          jest.fn()
        );

        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              spendingCategoryId: 'cat-123',
              bankAccountId: 'account-456',
            }),
          })
        );
      });

      it('should use JSON format when specified', async () => {
        await (ExportService as any).exportTransactions(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          {},
          jest.fn()
        );

        expect(ExportService['writeJSON']).toHaveBeenCalledWith('/path/to/file.json', expect.any(Array));
        expect(ExportService['writeCSV']).not.toHaveBeenCalled();
      });
    });

    describe('exportPayments', () => {
      const mockPayments = [
        {
          id: 'pay-1',
          payee: 'Electric Company',
          amount: 150.00,
          dueDate: new Date('2024-01-15'),
          paidDate: new Date('2024-01-14'),
          paidAmount: 150.00,
          status: 'paid',
          frequency: 'monthly',
          autoPayEnabled: true,
          notes: 'Auto-pay enabled',
          spendingCategory: { name: 'Utilities' },
          attributions: [
            {
              amount: 75.00,
              incomeEvent: { name: 'Salary Jan 1' },
            },
            {
              amount: 75.00,
              incomeEvent: { name: 'Salary Jan 15' },
            },
          ],
        },
      ];

      beforeEach(() => {
        mockPrisma.payment.findMany.mockResolvedValue(mockPayments as any);
        jest.spyOn(ExportService as any, 'writeCSV').mockResolvedValue(undefined);
      });

      it('should export payments with attribution details', async () => {
        await (ExportService as any).exportPayments(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          {},
          jest.fn()
        );

        const expectedData = [
          {
            id: 'pay-1',
            payee: 'Electric Company',
            amount: 150.00,
            dueDate: '2024-01-15',
            paidDate: '2024-01-14',
            paidAmount: 150.00,
            status: 'paid',
            frequency: 'monthly',
            category: 'Utilities',
            autoPayEnabled: 'Yes',
            attributions: 'Salary Jan 1: $75; Salary Jan 15: $75',
            notes: 'Auto-pay enabled',
          },
        ];

        expect(ExportService['writeCSV']).toHaveBeenCalledWith('/path/to/file.csv', expectedData);
      });

      it('should handle payments without attributions', async () => {
        const paymentWithoutAttributions = [{
          ...mockPayments[0],
          attributions: [],
          paidDate: null,
          paidAmount: null,
          notes: null,
        }];
        mockPrisma.payment.findMany.mockResolvedValue(paymentWithoutAttributions as any);

        await (ExportService as any).exportPayments(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          {},
          jest.fn()
        );

        const expectedData = [
          expect.objectContaining({
            paidDate: '',
            paidAmount: '',
            attributions: '',
            notes: '',
          }),
        ];

        expect(ExportService['writeCSV']).toHaveBeenCalledWith('/path/to/file.csv', expectedData);
      });
    });

    describe('exportReport', () => {
      const mockReportData = {
        summary: { totalIncome: 5000, totalExpenses: 3500 },
        periods: [
          { period: '2024-01', totalIncome: 2500, totalExpenses: 1800 },
          { period: '2024-02', totalIncome: 2500, totalExpenses: 1700 },
        ],
      };

      beforeEach(() => {
        mockReportsService.generateCashFlowReport.mockResolvedValue(mockReportData);
        jest.spyOn(ExportService as any, 'writeJSON').mockResolvedValue(undefined);
        jest.spyOn(ExportService as any, 'writeCSV').mockResolvedValue(undefined);
        jest.spyOn(ExportService as any, 'flattenReportData').mockReturnValue([
          { period: '2024-01', totalIncome: 2500, totalExpenses: 1800, netCashFlow: 700 },
          { period: '2024-02', totalIncome: 2500, totalExpenses: 1700, netCashFlow: 800 },
        ]);
      });

      it('should export cash flow report', async () => {
        const parameters = {
          reportType: 'cash_flow',
          dateRange: {
            fromDate: new Date('2024-01-01'),
            toDate: new Date('2024-02-29'),
          },
        };

        await (ExportService as any).exportReport(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          parameters,
          jest.fn()
        );

        expect(mockReportsService.generateCashFlowReport).toHaveBeenCalledWith(
          mockFamilyId,
          parameters.dateRange
        );
        expect(ExportService['writeJSON']).toHaveBeenCalledWith('/path/to/file.json', mockReportData);
      });

      it('should use default date range when not provided', async () => {
        const parameters = { reportType: 'cash_flow' };

        await (ExportService as any).exportReport(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          parameters,
          jest.fn()
        );

        expect(mockReportsService.generateCashFlowReport).toHaveBeenCalledWith(
          mockFamilyId,
          expect.objectContaining({
            fromDate: expect.any(Date),
            toDate: expect.any(Date),
          })
        );
      });

      it('should flatten report data for CSV export', async () => {
        const parameters = { reportType: 'cash_flow' };

        await (ExportService as any).exportReport(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          parameters,
          jest.fn()
        );

        expect(ExportService['flattenReportData']).toHaveBeenCalledWith(mockReportData, 'cash_flow');
        expect(ExportService['writeCSV']).toHaveBeenCalledWith('/path/to/file.csv', expect.any(Array));
      });

      it('should throw error when report type missing', async () => {
        const parameters = {};

        await expect((ExportService as any).exportReport(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          parameters,
          jest.fn()
        )).rejects.toThrow('Report type is required for report exports');
      });

      it('should throw error for unsupported report type', async () => {
        const parameters = { reportType: 'unsupported_type' };

        await expect((ExportService as any).exportReport(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          parameters,
          jest.fn()
        )).rejects.toThrow('Unsupported report type: unsupported_type');
      });
    });

    describe('exportAllData', () => {
      beforeEach(() => {
        mockPrisma.transaction.findMany.mockResolvedValue([]);
        mockPrisma.payment.findMany.mockResolvedValue([]);
        mockPrisma.incomeEvent.findMany.mockResolvedValue([]);
        mockPrisma.family.findUnique.mockResolvedValue({ id: mockFamilyId });
        jest.spyOn(ExportService as any, 'writeJSON').mockResolvedValue(undefined);
      });

      it('should export all family data', async () => {
        await (ExportService as any).exportAllData(
          mockFamilyId,
          'json',
          '/path/to/file.json',
          {},
          jest.fn()
        );

        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
          where: { bankAccount: { familyId: mockFamilyId } },
          include: { spendingCategory: true, bankAccount: true },
        });

        expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
          where: { familyId: mockFamilyId },
          include: { spendingCategory: true, attributions: { include: { incomeEvent: true } } },
        });

        expect(mockPrisma.family.findUnique).toHaveBeenCalledWith({
          where: { id: mockFamilyId },
          include: {
            familyMembers: { select: expect.objectContaining({ id: true, email: true }) },
            budgetCategories: true,
            spendingCategories: true,
            bankAccounts: true,
          },
        });

        expect(ExportService['writeJSON']).toHaveBeenCalledWith(
          '/path/to/file.json',
          expect.objectContaining({
            transactions: [],
            payments: [],
            incomeEvents: [],
            family: { id: mockFamilyId },
          })
        );
      });

      it('should throw error for non-JSON format', async () => {
        await expect((ExportService as any).exportAllData(
          mockFamilyId,
          'csv',
          '/path/to/file.csv',
          {},
          jest.fn()
        )).rejects.toThrow('All data export only supports JSON format');
      });
    });

    describe('file writing methods', () => {
      describe('writeCSV', () => {
        it('should write CSV data with headers', async () => {
          const mockStringifier = {
            pipe: jest.fn(),
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
          };
          const mockWriteStream = {
            on: jest.fn(),
          };

          mockStringify.mockReturnValue(mockStringifier);
          mockCreateWriteStream.mockReturnValue(mockWriteStream as any);

          const testData = [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
          ];

          // Simulate successful completion
          setTimeout(() => {
            mockWriteStream.on.mock.calls.find(call => call[0] === 'close')?.[1]();
          }, 0);

          await (ExportService as any).writeCSV('/path/to/file.csv', testData);

          expect(mockStringify).toHaveBeenCalledWith({
            header: true,
            columns: ['name', 'age'],
          });
          expect(mockCreateWriteStream).toHaveBeenCalledWith('/path/to/file.csv');
          expect(mockStringifier.write).toHaveBeenCalledWith({ name: 'John', age: 30 });
          expect(mockStringifier.write).toHaveBeenCalledWith({ name: 'Jane', age: 25 });
          expect(mockStringifier.end).toHaveBeenCalled();
        });

        it('should handle empty data', async () => {
          await (ExportService as any).writeCSV('/path/to/file.csv', []);

          expect(mockfs.writeFile).toHaveBeenCalledWith('/path/to/file.csv', 'No data available');
          expect(mockStringify).not.toHaveBeenCalled();
        });

        it('should handle write errors', async () => {
          const mockStringifier = {
            pipe: jest.fn(),
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
          };
          const mockWriteStream = { on: jest.fn() };

          mockStringify.mockReturnValue(mockStringifier);
          mockCreateWriteStream.mockReturnValue(mockWriteStream as any);

          const testError = new Error('Write failed');

          // Simulate error
          setTimeout(() => {
            mockWriteStream.on.mock.calls.find(call => call[0] === 'error')?.[1](testError);
          }, 0);

          const testData = [{ name: 'John', age: 30 }];

          await expect((ExportService as any).writeCSV('/path/to/file.csv', testData)).rejects.toThrow('Write failed');
        });
      });

      describe('writeJSON', () => {
        it('should write JSON data with formatting', async () => {
          const testData = { name: 'John', age: 30 };

          await (ExportService as any).writeJSON('/path/to/file.json', testData);

          expect(mockfs.writeFile).toHaveBeenCalledWith(
            '/path/to/file.json',
            JSON.stringify(testData, null, 2)
          );
        });
      });
    });
  });

  describe('utility methods', () => {
    describe('calculateEstimatedCompletion', () => {
      it('should calculate completion time for different export types', () => {
        const baseTime = Date.now();

        const transactionTime = (ExportService as any).calculateEstimatedCompletion('transactions', 'csv');
        const allDataTime = (ExportService as any).calculateEstimatedCompletion('all_data', 'pdf');

        // Transactions should be faster (3 min) than all_data (10 min)
        expect(transactionTime.getTime() - baseTime).toBeLessThan(allDataTime.getTime() - baseTime);

        // PDF should take longer than CSV (1.5x multiplier)
        const csvTime = (ExportService as any).calculateEstimatedCompletion('reports', 'csv');
        const pdfTime = (ExportService as any).calculateEstimatedCompletion('reports', 'pdf');

        expect(pdfTime.getTime() - baseTime).toBeGreaterThan(csvTime.getTime() - baseTime);
      });
    });

    describe('getFileExtension', () => {
      it('should return correct file extensions', () => {
        expect((ExportService as any).getFileExtension('csv')).toBe('csv');
        expect((ExportService as any).getFileExtension('json')).toBe('json');
        expect((ExportService as any).getFileExtension('pdf')).toBe('pdf');
        expect((ExportService as any).getFileExtension('excel')).toBe('xlsx');
        expect((ExportService as any).getFileExtension('unknown' as ExportFormat)).toBe('json');
      });
    });

    describe('flattenReportData', () => {
      it('should flatten cash flow report data', () => {
        const reportData = [
          { period: '2024-01', totalIncome: 5000, totalExpenses: 3000, netCashFlow: 2000 },
          { period: '2024-02', totalIncome: 5500, totalExpenses: 3200, netCashFlow: 2300 },
        ];

        const result = (ExportService as any).flattenReportData(reportData, 'cash_flow');

        expect(result).toEqual([
          { period: '2024-01', totalIncome: 5000, totalExpenses: 3000, netCashFlow: 2000 },
          { period: '2024-02', totalIncome: 5500, totalExpenses: 3200, netCashFlow: 2300 },
        ]);
      });

      it('should extract category breakdown for spending analysis', () => {
        const reportData = {
          categoryBreakdown: [
            { category: 'Food', amount: 500, percentage: 20 },
            { category: 'Transport', amount: 300, percentage: 12 },
          ],
          totalSpending: 2500,
        };

        const result = (ExportService as any).flattenReportData(reportData, 'spending_analysis');

        expect(result).toEqual(reportData.categoryBreakdown);
      });

      it('should handle non-array data', () => {
        const reportData = { summary: 'test' };

        const result = (ExportService as any).flattenReportData(reportData, 'unknown_type');

        expect(result).toEqual([reportData]);
      });

      it('should handle empty data', () => {
        const result = (ExportService as any).flattenReportData({ categoryBreakdown: null }, 'spending_analysis');

        expect(result).toEqual([]);
      });
    });

    describe('updateProgress', () => {
      it('should update export job progress', async () => {
        await (ExportService as any).updateProgress('export-123', 50);

        expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
          where: { id: 'export-123' },
          data: { progress: 50 },
        });
      });

      it('should clamp progress between 0 and 100', async () => {
        await (ExportService as any).updateProgress('export-123', 150);
        await (ExportService as any).updateProgress('export-123', -10);

        expect(mockPrisma.exportJob.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { progress: 100 },
          })
        );
        expect(mockPrisma.exportJob.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { progress: 0 },
          })
        );
      });
    });
  });

  describe('cleanupExpiredExports', () => {
    const mockExpiredJobs = [
      {
        id: 'expired-1',
        filePath: '/path/to/expired1.csv',
        expiresAt: new Date('2023-12-31'),
      },
      {
        id: 'expired-2',
        filePath: null,
        expiresAt: new Date('2023-12-30'),
      },
    ];

    beforeEach(() => {
      mockPrisma.exportJob.findMany.mockResolvedValue(mockExpiredJobs as any);
      mockPrisma.exportJob.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockfs.unlink.mockResolvedValue(undefined);
    });

    it('should cleanup expired export jobs and files', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await ExportService.cleanupExpiredExports();

      expect(mockPrisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });

      expect(mockfs.unlink).toHaveBeenCalledWith('/path/to/expired1.csv');
      expect(mockfs.unlink).toHaveBeenCalledTimes(1); // Only for job with filePath

      expect(mockPrisma.exportJob.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });

      expect(consoleSpy).toHaveBeenCalledWith('Cleaned up 2 expired export jobs');

      consoleSpy.mockRestore();
    });

    it('should handle file deletion errors gracefully', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      mockfs.unlink.mockRejectedValue(new Error('File not found'));

      await ExportService.cleanupExpiredExports();

      expect(consoleWarn).toHaveBeenCalledWith(
        'Failed to delete expired export file /path/to/expired1.csv:',
        expect.any(Error)
      );
      expect(mockPrisma.exportJob.deleteMany).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith('Cleaned up 2 expired export jobs');

      consoleWarn.mockRestore();
      consoleLog.mockRestore();
    });

    it('should handle no expired jobs', async () => {
      mockPrisma.exportJob.findMany.mockResolvedValue([]);
      mockPrisma.exportJob.deleteMany.mockResolvedValue({ count: 0 } as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await ExportService.cleanupExpiredExports();

      expect(mockfs.unlink).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Cleaned up 0 expired export jobs');

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle export data method errors', async () => {
      mockPrisma.exportJob.update.mockResolvedValue(mockExportJob as any);
      mockPrisma.exportJob.findUnique.mockResolvedValue(mockExportJob as any);

      // Mock the exportData method to throw an error
      jest.spyOn(ExportService as any, 'exportData').mockRejectedValue(new Error('Export failed'));

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Call processExport indirectly through createExport
      await ExportService.createExport(mockFamilyId, mockUserId, {
        exportType: 'transactions',
        format: 'csv',
      });

      // Wait a bit for the async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleError).toHaveBeenCalledWith(
        `Export ${mockExportJob.id} failed:`,
        expect.any(Error)
      );

      consoleError.mkRe

      consoleError.mockRestore();
    });

    it('should handle missing export job in processExport', async () => {
      mockPrisma.exportJob.update.mockResolvedValue(mockExportJob as any);
      mockPrisma.exportJob.findUnique.mockResolvedValue(null);

      await expect((ExportService as any).processExport('nonexistent')).rejects.toThrow('Export job not found');

      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        data: { status: 'processing', progress: 0 },
      });
    });

    it('should handle unsupported export type', async () => {
      mockPrisma.exportJob.update.mockResolvedValue(mockExportJob as any);
      mockPrisma.exportJob.findUnique.mockResolvedValue({
        ...mockExportJob,
        exportType: 'unsupported_type',
      } as any);

      await expect((ExportService as any).processExport('export-123')).rejects.toThrow('Unsupported export type: unsupported_type');

      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            error: 'Unsupported export type: unsupported_type',
          }),
        })
      );
    });

    it('should handle directory creation errors', async () => {
      mockfs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockPrisma.exportJob.update.mockResolvedValue(mockExportJob as any);
      mockPrisma.exportJob.findUnique.mockResolvedValue(mockExportJob as any);

      await expect((ExportService as any).processExport('export-123')).rejects.toThrow('Permission denied');
    });
  });
});