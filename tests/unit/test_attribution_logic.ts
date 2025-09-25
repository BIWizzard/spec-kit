import { AttributionService, CreateAttributionData, UpdateAttributionData, SplitPaymentData } from '../../backend/src/services/attribution.service';
import { prisma } from '../../backend/src/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../../backend/src/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    payment: {
      findFirst: jest.fn(),
    },
    incomeEvent: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    paymentAttribution: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AttributionService', () => {
  const mockFamilyId = 'family-123';
  const mockUserId = 'user-123';
  const mockPaymentId = 'payment-123';
  const mockIncomeEventId = 'income-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default transaction mock that executes the callback
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      throw new Error('Invalid transaction callback');
    });
  });

  describe('createAttribution', () => {
    const mockPayment = {
      id: mockPaymentId,
      amount: new Decimal(1000),
      paymentAttributions: [],
    };

    const mockIncomeEvent = {
      id: mockIncomeEventId,
      remainingAmount: new Decimal(2000),
    };

    const mockCreateData: CreateAttributionData = {
      paymentId: mockPaymentId,
      incomeEventId: mockIncomeEventId,
      amount: 500,
      attributionType: 'manual' as const,
    };

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment as any);
      mockPrisma.incomeEvent.findFirst.mockResolvedValue(mockIncomeEvent as any);
      mockPrisma.paymentAttribution.create.mockResolvedValue({
        id: 'attribution-123',
        paymentId: mockPaymentId,
        incomeEventId: mockIncomeEventId,
        amount: new Decimal(500),
        attributionType: 'manual',
        createdBy: mockUserId,
        createdAt: new Date(),
      } as any);
      mockPrisma.incomeEvent.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);
    });

    it('should create attribution successfully with valid data', async () => {
      const result = await AttributionService.createAttribution(
        mockFamilyId,
        mockCreateData,
        mockUserId
      );

      expect(result.id).toBe('attribution-123');
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: mockPaymentId, familyId: mockFamilyId },
        include: { paymentAttributions: true },
      });
      expect(mockPrisma.incomeEvent.findFirst).toHaveBeenCalledWith({
        where: { id: mockIncomeEventId, familyId: mockFamilyId },
      });
      expect(mockPrisma.paymentAttribution.create).toHaveBeenCalledWith({
        data: {
          paymentId: mockPaymentId,
          incomeEventId: mockIncomeEventId,
          amount: new Decimal(500),
          attributionType: 'manual',
          createdBy: mockUserId,
        },
      });
    });

    it('should update income event allocated and remaining amounts', async () => {
      await AttributionService.createAttribution(
        mockFamilyId,
        mockCreateData,
        mockUserId
      );

      expect(mockPrisma.incomeEvent.update).toHaveBeenCalledWith({
        where: { id: mockIncomeEventId },
        data: {
          allocatedAmount: { increment: 500 },
          remainingAmount: { decrement: 500 },
        },
      });
    });

    it('should create audit log entry', async () => {
      await AttributionService.createAttribution(
        mockFamilyId,
        mockCreateData,
        mockUserId
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          familyMemberId: mockUserId,
          action: 'create',
          entityType: 'PaymentAttribution',
          entityId: 'attribution-123',
          oldValues: {},
          newValues: {
            paymentId: mockPaymentId,
            incomeEventId: mockIncomeEventId,
            amount: 500,
            attributionType: 'manual',
          },
          ipAddress: '',
        },
      });
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.createAttribution(mockFamilyId, mockCreateData, mockUserId)
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error when income event not found', async () => {
      mockPrisma.incomeEvent.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.createAttribution(mockFamilyId, mockCreateData, mockUserId)
      ).rejects.toThrow('Income event not found');
    });

    it('should throw error when attribution amount exceeds payment amount', async () => {
      const paymentWithExistingAttribution = {
        ...mockPayment,
        paymentAttributions: [
          { amount: new Decimal(600) },
        ],
      };
      mockPrisma.payment.findFirst.mockResolvedValue(paymentWithExistingAttribution as any);

      await expect(
        AttributionService.createAttribution(mockFamilyId, mockCreateData, mockUserId)
      ).rejects.toThrow('Attribution amount exceeds payment amount');
    });

    it('should throw error when attribution amount exceeds available income', async () => {
      const incomeWithLowRemaining = {
        ...mockIncomeEvent,
        remainingAmount: new Decimal(300),
      };
      mockPrisma.incomeEvent.findFirst.mockResolvedValue(incomeWithLowRemaining as any);

      await expect(
        AttributionService.createAttribution(mockFamilyId, mockCreateData, mockUserId)
      ).rejects.toThrow('Attribution amount exceeds available income');
    });

    it('should throw error when attribution amount is not positive', async () => {
      const invalidData = { ...mockCreateData, amount: 0 };

      await expect(
        AttributionService.createAttribution(mockFamilyId, invalidData, mockUserId)
      ).rejects.toThrow('Attribution amount must be positive');
    });

    it('should throw error when attribution amount is negative', async () => {
      const invalidData = { ...mockCreateData, amount: -100 };

      await expect(
        AttributionService.createAttribution(mockFamilyId, invalidData, mockUserId)
      ).rejects.toThrow('Attribution amount must be positive');
    });

    it('should handle automatic attribution type', async () => {
      const autoData = { ...mockCreateData, attributionType: 'automatic' as const };

      await AttributionService.createAttribution(mockFamilyId, autoData, mockUserId);

      expect(mockPrisma.paymentAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attributionType: 'automatic',
          }),
        })
      );
    });
  });

  describe('updateAttribution', () => {
    const mockAttributionId = 'attribution-123';
    const mockUpdateData: UpdateAttributionData = {
      amount: 600,
    };

    const mockAttribution = {
      id: mockAttributionId,
      amount: new Decimal(500),
      paymentId: mockPaymentId,
      incomeEventId: mockIncomeEventId,
      payment: {
        amount: new Decimal(1000),
        paymentAttributions: [
          { id: mockAttributionId, amount: new Decimal(500) },
          { id: 'other-attr', amount: new Decimal(200) },
        ],
      },
      incomeEvent: {
        remainingAmount: new Decimal(1000),
      },
    };

    beforeEach(() => {
      mockPrisma.paymentAttribution.findFirst.mockResolvedValue(mockAttribution as any);
      mockPrisma.paymentAttribution.update.mockResolvedValue({
        ...mockAttribution,
        amount: new Decimal(600),
      } as any);
      mockPrisma.incomeEvent.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);
    });

    it('should update attribution successfully', async () => {
      const result = await AttributionService.updateAttribution(
        mockFamilyId,
        mockAttributionId,
        mockUpdateData,
        mockUserId
      );

      expect(result.amount).toEqual(new Decimal(600));
      expect(mockPrisma.paymentAttribution.update).toHaveBeenCalledWith({
        where: { id: mockAttributionId },
        data: { amount: new Decimal(600) },
      });
    });

    it('should update income event amounts when amount changes', async () => {
      await AttributionService.updateAttribution(
        mockFamilyId,
        mockAttributionId,
        mockUpdateData,
        mockUserId
      );

      const amountDifference = 600 - 500; // 100
      expect(mockPrisma.incomeEvent.update).toHaveBeenCalledWith({
        where: { id: mockIncomeEventId },
        data: {
          allocatedAmount: { increment: amountDifference },
          remainingAmount: { decrement: amountDifference },
        },
      });
    });

    it('should not update income event when amount stays the same', async () => {
      const sameAmountData = { amount: 500 };

      await AttributionService.updateAttribution(
        mockFamilyId,
        mockAttributionId,
        sameAmountData,
        mockUserId
      );

      expect(mockPrisma.incomeEvent.update).not.toHaveBeenCalled();
    });

    it('should throw error when attribution not found', async () => {
      mockPrisma.paymentAttribution.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.updateAttribution(mockFamilyId, mockAttributionId, mockUpdateData, mockUserId)
      ).rejects.toThrow('Attribution not found');
    });

    it('should throw error when updated amount exceeds payment capacity', async () => {
      const largeUpdateData = { amount: 900 }; // Other attrs total 200, so 900 + 200 > 1000

      await expect(
        AttributionService.updateAttribution(mockFamilyId, mockAttributionId, largeUpdateData, mockUserId)
      ).rejects.toThrow('Updated attribution amount exceeds payment amount');
    });

    it('should throw error when updated amount exceeds available income', async () => {
      const attributionWithLowIncome = {
        ...mockAttribution,
        incomeEvent: {
          remainingAmount: new Decimal(100), // Only 100 + current 500 = 600 available
        },
      };
      mockPrisma.paymentAttribution.findFirst.mockResolvedValue(attributionWithLowIncome as any);

      const largeUpdateData = { amount: 700 };

      await expect(
        AttributionService.updateAttribution(mockFamilyId, mockAttributionId, largeUpdateData, mockUserId)
      ).rejects.toThrow('Updated attribution amount exceeds available income');
    });

    it('should create audit log with old and new values', async () => {
      await AttributionService.updateAttribution(
        mockFamilyId,
        mockAttributionId,
        mockUpdateData,
        mockUserId
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          familyMemberId: mockUserId,
          action: 'update',
          entityType: 'PaymentAttribution',
          entityId: mockAttributionId,
          oldValues: { amount: 500 },
          newValues: { amount: 600 },
          ipAddress: '',
        },
      });
    });
  });

  describe('deleteAttribution', () => {
    const mockAttributionId = 'attribution-123';

    const mockAttribution = {
      id: mockAttributionId,
      amount: new Decimal(500),
      paymentId: mockPaymentId,
      incomeEventId: mockIncomeEventId,
      payment: {},
      incomeEvent: {},
    };

    beforeEach(() => {
      mockPrisma.paymentAttribution.findFirst.mockResolvedValue(mockAttribution as any);
      mockPrisma.paymentAttribution.delete.mockResolvedValue(mockAttribution as any);
      mockPrisma.incomeEvent.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);
    });

    it('should delete attribution successfully', async () => {
      await AttributionService.deleteAttribution(mockFamilyId, mockAttributionId, mockUserId);

      expect(mockPrisma.paymentAttribution.delete).toHaveBeenCalledWith({
        where: { id: mockAttributionId },
      });
    });

    it('should restore income event amounts', async () => {
      await AttributionService.deleteAttribution(mockFamilyId, mockAttributionId, mockUserId);

      expect(mockPrisma.incomeEvent.update).toHaveBeenCalledWith({
        where: { id: mockIncomeEventId },
        data: {
          allocatedAmount: { decrement: 500 },
          remainingAmount: { increment: 500 },
        },
      });
    });

    it('should create audit log entry', async () => {
      await AttributionService.deleteAttribution(mockFamilyId, mockAttributionId, mockUserId);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          familyMemberId: mockUserId,
          action: 'delete',
          entityType: 'PaymentAttribution',
          entityId: mockAttributionId,
          oldValues: {
            paymentId: mockPaymentId,
            incomeEventId: mockIncomeEventId,
            amount: 500,
          },
          newValues: {},
          ipAddress: '',
        },
      });
    });

    it('should throw error when attribution not found', async () => {
      mockPrisma.paymentAttribution.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.deleteAttribution(mockFamilyId, mockAttributionId, mockUserId)
      ).rejects.toThrow('Attribution not found');
    });
  });

  describe('splitPaymentAcrossIncome', () => {
    const mockSplitData: SplitPaymentData = {
      paymentId: mockPaymentId,
      attributions: [
        { incomeEventId: 'income-1', amount: 400 },
        { incomeEventId: 'income-2', amount: 600 },
      ],
      attributionType: 'manual',
    };

    const mockPayment = {
      id: mockPaymentId,
      amount: new Decimal(1000),
      paymentAttributions: [],
    };

    const mockIncomeEvents = [
      { id: 'income-1', name: 'Salary 1', remainingAmount: new Decimal(800) },
      { id: 'income-2', name: 'Salary 2', remainingAmount: new Decimal(1200) },
    ];

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment as any);
      mockPrisma.incomeEvent.findFirst
        .mockResolvedValueOnce(mockIncomeEvents[0] as any)
        .mockResolvedValueOnce(mockIncomeEvents[1] as any);
      mockPrisma.paymentAttribution.create
        .mockResolvedValueOnce({
          id: 'attr-1',
          paymentId: mockPaymentId,
          incomeEventId: 'income-1',
          amount: new Decimal(400),
        } as any)
        .mockResolvedValueOnce({
          id: 'attr-2',
          paymentId: mockPaymentId,
          incomeEventId: 'income-2',
          amount: new Decimal(600),
        } as any);
      mockPrisma.incomeEvent.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);
    });

    it('should split payment across multiple income events', async () => {
      const result = await AttributionService.splitPaymentAcrossIncome(
        mockFamilyId,
        mockSplitData,
        mockUserId
      );

      expect(result).toHaveLength(2);
      expect(result[0].amount).toEqual(new Decimal(400));
      expect(result[1].amount).toEqual(new Decimal(600));
    });

    it('should create all attributions', async () => {
      await AttributionService.splitPaymentAcrossIncome(
        mockFamilyId,
        mockSplitData,
        mockUserId
      );

      expect(mockPrisma.paymentAttribution.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.paymentAttribution.create).toHaveBeenNthCalledWith(1, {
        data: {
          paymentId: mockPaymentId,
          incomeEventId: 'income-1',
          amount: new Decimal(400),
          attributionType: 'manual',
          createdBy: mockUserId,
        },
      });
    });

    it('should update all income events', async () => {
      await AttributionService.splitPaymentAcrossIncome(
        mockFamilyId,
        mockSplitData,
        mockUserId
      );

      expect(mockPrisma.incomeEvent.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.incomeEvent.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'income-1' },
        data: {
          allocatedAmount: { increment: 400 },
          remainingAmount: { decrement: 400 },
        },
      });
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.splitPaymentAcrossIncome(mockFamilyId, mockSplitData, mockUserId)
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error when payment already has attributions', async () => {
      const paymentWithAttribution = {
        ...mockPayment,
        paymentAttributions: [{ id: 'existing-attr' }],
      };
      mockPrisma.payment.findFirst.mockResolvedValue(paymentWithAttribution as any);

      await expect(
        AttributionService.splitPaymentAcrossIncome(mockFamilyId, mockSplitData, mockUserId)
      ).rejects.toThrow('Payment already has attributions. Delete existing attributions first.');
    });

    it('should throw error when total attribution amounts do not equal payment amount', async () => {
      const invalidSplitData = {
        ...mockSplitData,
        attributions: [
          { incomeEventId: 'income-1', amount: 300 },
          { incomeEventId: 'income-2', amount: 500 }, // Total 800 != 1000
        ],
      };

      await expect(
        AttributionService.splitPaymentAcrossIncome(mockFamilyId, invalidSplitData, mockUserId)
      ).rejects.toThrow('Total attribution amounts must equal payment amount');
    });

    it('should throw error when income event not found', async () => {
      mockPrisma.incomeEvent.findFirst
        .mockResolvedValueOnce(mockIncomeEvents[0] as any)
        .mockResolvedValueOnce(null);

      await expect(
        AttributionService.splitPaymentAcrossIncome(mockFamilyId, mockSplitData, mockUserId)
      ).rejects.toThrow('Income event not found: income-2');
    });

    it('should throw error when attribution exceeds available income', async () => {
      const incomeWithLowRemaining = {
        ...mockIncomeEvents[1],
        remainingAmount: new Decimal(500), // Less than required 600
      };
      mockPrisma.incomeEvent.findFirst
        .mockResolvedValueOnce(mockIncomeEvents[0] as any)
        .mockResolvedValueOnce(incomeWithLowRemaining as any);

      await expect(
        AttributionService.splitPaymentAcrossIncome(mockFamilyId, mockSplitData, mockUserId)
      ).rejects.toThrow('Attribution amount exceeds available income for Salary 2');
    });

    it('should create comprehensive audit log', async () => {
      await AttributionService.splitPaymentAcrossIncome(
        mockFamilyId,
        mockSplitData,
        mockUserId
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          familyMemberId: mockUserId,
          action: 'create',
          entityType: 'PaymentAttribution',
          entityId: 'split',
          oldValues: {},
          newValues: {
            paymentId: mockPaymentId,
            splitCount: 2,
            totalAmount: 1000,
            attributions: mockSplitData.attributions,
          },
          ipAddress: '',
        },
      });
    });
  });

  describe('getPaymentAttributions', () => {
    const mockPaymentWithAttributions = {
      id: mockPaymentId,
      amount: new Decimal(1000),
      paymentAttributions: [
        {
          id: 'attr-1',
          amount: new Decimal(400),
          incomeEvent: {
            name: 'Salary January',
            scheduledDate: new Date('2024-01-15'),
          },
        },
        {
          id: 'attr-2',
          amount: new Decimal(300),
          incomeEvent: {
            name: 'Bonus',
            scheduledDate: new Date('2024-01-20'),
          },
        },
      ],
    };

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentWithAttributions as any);
    });

    it('should return attribution summary with correct calculations', async () => {
      const result = await AttributionService.getPaymentAttributions(mockFamilyId, mockPaymentId);

      expect(result.totalAttributed).toBe(700);
      expect(result.remainingAmount).toBe(300);
      expect(result.attributions).toHaveLength(2);

      expect(result.attributions[0]).toEqual({
        id: 'attr-1',
        incomeEventName: 'Salary January',
        incomeEventDate: new Date('2024-01-15'),
        amount: 400,
        percentage: 40, // 400/1000 * 100
      });

      expect(result.attributions[1]).toEqual({
        id: 'attr-2',
        incomeEventName: 'Bonus',
        incomeEventDate: new Date('2024-01-20'),
        amount: 300,
        percentage: 30, // 300/1000 * 100
      });
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.getPaymentAttributions(mockFamilyId, mockPaymentId)
      ).rejects.toThrow('Payment not found');
    });

    it('should handle payment with no attributions', async () => {
      const paymentWithoutAttributions = {
        ...mockPaymentWithAttributions,
        paymentAttributions: [],
      };
      mockPrisma.payment.findFirst.mockResolvedValue(paymentWithoutAttributions as any);

      const result = await AttributionService.getPaymentAttributions(mockFamilyId, mockPaymentId);

      expect(result.totalAttributed).toBe(0);
      expect(result.remainingAmount).toBe(1000);
      expect(result.attributions).toHaveLength(0);
    });
  });

  describe('getIncomeAttributions', () => {
    const mockIncomeWithAttributions = {
      id: mockIncomeEventId,
      amount: new Decimal(2000),
      allocatedAmount: new Decimal(1200),
      remainingAmount: new Decimal(800),
      paymentAttributions: [
        {
          id: 'attr-1',
          amount: new Decimal(700),
          payment: {
            payee: 'Electric Company',
            dueDate: new Date('2024-01-15'),
          },
        },
        {
          id: 'attr-2',
          amount: new Decimal(500),
          payment: {
            payee: 'Rent',
            dueDate: new Date('2024-01-01'),
          },
        },
      ],
    };

    beforeEach(() => {
      mockPrisma.incomeEvent.findFirst.mockResolvedValue(mockIncomeWithAttributions as any);
    });

    it('should return income attribution summary with correct calculations', async () => {
      const result = await AttributionService.getIncomeAttributions(mockFamilyId, mockIncomeEventId);

      expect(result.totalAttributed).toBe(1200);
      expect(result.remainingAmount).toBe(800);
      expect(result.attributions).toHaveLength(2);

      expect(result.attributions[0]).toEqual({
        id: 'attr-1',
        paymentPayee: 'Electric Company',
        paymentDueDate: new Date('2024-01-15'),
        amount: 700,
        percentage: 35, // 700/2000 * 100
      });

      expect(result.attributions[1]).toEqual({
        id: 'attr-2',
        paymentPayee: 'Rent',
        paymentDueDate: new Date('2024-01-01'),
        amount: 500,
        percentage: 25, // 500/2000 * 100
      });
    });

    it('should throw error when income event not found', async () => {
      mockPrisma.incomeEvent.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.getIncomeAttributions(mockFamilyId, mockIncomeEventId)
      ).rejects.toThrow('Income event not found');
    });
  });

  describe('autoAttributePayment', () => {
    const mockPayment = {
      id: mockPaymentId,
      amount: new Decimal(800),
      dueDate: new Date('2024-01-20'),
      paymentAttributions: [],
    };

    const mockAvailableIncomes = [
      {
        id: 'income-1',
        amount: new Decimal(2000),
        remainingAmount: new Decimal(1500),
        scheduledDate: new Date('2024-01-15'),
        status: 'scheduled',
      },
    ];

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment as any);
      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockAvailableIncomes as any);

      // Mock the createAttribution call
      jest.spyOn(AttributionService, 'createAttribution').mockResolvedValue({
        id: 'auto-attr-123',
        paymentId: mockPaymentId,
        incomeEventId: 'income-1',
        amount: new Decimal(800),
        attributionType: 'automatic',
      } as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should auto-attribute payment to earliest suitable income', async () => {
      const result = await AttributionService.autoAttributePayment(
        mockFamilyId,
        mockPaymentId,
        mockUserId
      );

      expect(result).toBeTruthy();
      expect(result?.id).toBe('auto-attr-123');

      expect(mockPrisma.incomeEvent.findMany).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          status: 'scheduled',
          remainingAmount: { gte: 800 },
          scheduledDate: { lte: mockPayment.dueDate },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 1,
      });

      expect(AttributionService.createAttribution).toHaveBeenCalledWith(
        mockFamilyId,
        {
          paymentId: mockPaymentId,
          incomeEventId: 'income-1',
          amount: 800,
          attributionType: 'automatic',
        },
        mockUserId
      );
    });

    it('should return null when no suitable income available', async () => {
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);

      const result = await AttributionService.autoAttributePayment(
        mockFamilyId,
        mockPaymentId,
        mockUserId
      );

      expect(result).toBeNull();
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.autoAttributePayment(mockFamilyId, mockPaymentId, mockUserId)
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error when payment already has attributions', async () => {
      const paymentWithAttribution = {
        ...mockPayment,
        paymentAttributions: [{ id: 'existing-attr' }],
      };
      mockPrisma.payment.findFirst.mockResolvedValue(paymentWithAttribution as any);

      await expect(
        AttributionService.autoAttributePayment(mockFamilyId, mockPaymentId, mockUserId)
      ).rejects.toThrow('Payment already has attributions');
    });
  });

  describe('suggestAttributions', () => {
    const mockPayment = {
      id: mockPaymentId,
      amount: new Decimal(600),
      dueDate: new Date('2024-01-20'),
    };

    const mockAvailableIncomes = [
      {
        id: 'income-1',
        name: 'Salary January',
        scheduledDate: new Date('2024-01-15'), // Before due date
        remainingAmount: new Decimal(1000), // Fully covers payment
        status: 'scheduled',
      },
      {
        id: 'income-2',
        name: 'Bonus',
        scheduledDate: new Date('2024-01-25'), // After due date
        remainingAmount: new Decimal(400), // Partially covers payment
        status: 'scheduled',
      },
      {
        id: 'income-3',
        name: 'Late Salary',
        scheduledDate: new Date('2024-01-30'),
        remainingAmount: new Decimal(200), // Small amount
        status: 'scheduled',
      },
    ];

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment as any);
      mockPrisma.incomeEvent.findMany.mockResolvedValue(mockAvailableIncomes as any);
    });

    it('should return suggestions sorted by confidence', async () => {
      const suggestions = await AttributionService.suggestAttributions(mockFamilyId, mockPaymentId);

      expect(suggestions).toHaveLength(3);

      // First suggestion should be high confidence (before due date, full coverage)
      expect(suggestions[0]).toEqual({
        incomeEventId: 'income-1',
        incomeEventName: 'Salary January',
        scheduledDate: new Date('2024-01-15'),
        availableAmount: 1000,
        suggestedAmount: 600,
        confidence: 'high',
      });

      // Second should be medium confidence (covers 50%+ of payment)
      expect(suggestions[1]).toEqual({
        incomeEventId: 'income-2',
        incomeEventName: 'Bonus',
        scheduledDate: new Date('2024-01-25'),
        availableAmount: 400,
        suggestedAmount: 400,
        confidence: 'medium',
      });

      // Third should be low confidence
      expect(suggestions[2]).toEqual({
        incomeEventId: 'income-3',
        incomeEventName: 'Late Salary',
        scheduledDate: new Date('2024-01-30'),
        availableAmount: 200,
        suggestedAmount: 200,
        confidence: 'low',
      });
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.suggestAttributions(mockFamilyId, mockPaymentId)
      ).rejects.toThrow('Payment not found');
    });

    it('should handle empty income events', async () => {
      mockPrisma.incomeEvent.findMany.mockResolvedValue([]);

      const suggestions = await AttributionService.suggestAttributions(mockFamilyId, mockPaymentId);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('validateAttributionCapacity', () => {
    const mockPayment = {
      id: mockPaymentId,
      amount: new Decimal(1000),
      paymentAttributions: [
        { amount: new Decimal(300) }, // Existing attribution
      ],
    };

    const proposedAttributions = [
      { incomeEventId: 'income-1', amount: 400 },
      { incomeEventId: 'income-2', amount: 200 },
    ];

    const mockIncomeEvents = [
      { id: 'income-1', name: 'Salary', remainingAmount: new Decimal(500) },
      { id: 'income-2', name: 'Bonus', remainingAmount: new Decimal(300) },
    ];

    beforeEach(() => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment as any);
      mockPrisma.incomeEvent.findFirst
        .mockResolvedValueOnce(mockIncomeEvents[0] as any)
        .mockResolvedValueOnce(mockIncomeEvents[1] as any);
    });

    it('should validate valid attribution proposals', async () => {
      const result = await AttributionService.validateAttributionCapacity(
        mockFamilyId,
        mockPaymentId,
        proposedAttributions
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalProposed).toBe(600);
      expect(result.paymentAmount).toBe(1000);
    });

    it('should detect when total exceeds payment amount', async () => {
      const excessiveProposal = [
        { incomeEventId: 'income-1', amount: 800 }, // 300 existing + 800 = 1100 > 1000
      ];

      const result = await AttributionService.validateAttributionCapacity(
        mockFamilyId,
        mockPaymentId,
        excessiveProposal
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Total attributions exceed payment amount');
    });

    it('should detect when amount exceeds available income', async () => {
      const excessiveIncomeProposal = [
        { incomeEventId: 'income-1', amount: 600 }, // Exceeds available 500
      ];

      const result = await AttributionService.validateAttributionCapacity(
        mockFamilyId,
        mockPaymentId,
        excessiveIncomeProposal
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount 600 exceeds available income for Salary');
    });

    it('should detect missing income events', async () => {
      mockPrisma.incomeEvent.findFirst
        .mockResolvedValueOnce(mockIncomeEvents[0] as any)
        .mockResolvedValueOnce(null);

      const result = await AttributionService.validateAttributionCapacity(
        mockFamilyId,
        mockPaymentId,
        proposedAttributions
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income event not found: income-2');
    });

    it('should detect non-positive amounts', async () => {
      const invalidAmountProposal = [
        { incomeEventId: 'income-1', amount: 0 },
        { incomeEventId: 'income-2', amount: -100 },
      ];

      const result = await AttributionService.validateAttributionCapacity(
        mockFamilyId,
        mockPaymentId,
        invalidAmountProposal
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Attribution amounts must be positive');
    });

    it('should throw error when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        AttributionService.validateAttributionCapacity(mockFamilyId, mockPaymentId, proposedAttributions)
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getAttributionHistory', () => {
    const mockAttributions = [
      {
        id: 'attr-1',
        amount: new Decimal(500),
        attributionType: 'manual' as const,
        createdAt: new Date('2024-01-20'),
        payment: { payee: 'Electric Company' },
        incomeEvent: { name: 'Salary January' },
        createdByMember: { firstName: 'John', lastName: 'Doe' },
      },
      {
        id: 'attr-2',
        amount: new Decimal(300),
        attributionType: 'automatic' as const,
        createdAt: new Date('2024-01-19'),
        payment: { payee: 'Rent' },
        incomeEvent: { name: 'Bonus' },
        createdByMember: null,
      },
    ];

    beforeEach(() => {
      mockPrisma.paymentAttribution.findMany.mockResolvedValue(mockAttributions as any);
    });

    it('should return formatted attribution history', async () => {
      const result = await AttributionService.getAttributionHistory(mockFamilyId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'attr-1',
        paymentPayee: 'Electric Company',
        incomeEventName: 'Salary January',
        amount: 500,
        attributionType: 'manual',
        createdAt: new Date('2024-01-20'),
        createdByName: 'John Doe',
      });
      expect(result[1]).toEqual({
        id: 'attr-2',
        paymentPayee: 'Rent',
        incomeEventName: 'Bonus',
        amount: 300,
        attributionType: 'automatic',
        createdAt: new Date('2024-01-19'),
        createdByName: 'System',
      });
    });

    it('should use correct query parameters with defaults', async () => {
      await AttributionService.getAttributionHistory(mockFamilyId);

      expect(mockPrisma.paymentAttribution.findMany).toHaveBeenCalledWith({
        where: { payment: { familyId: mockFamilyId } },
        include: {
          payment: { select: { payee: true } },
          incomeEvent: { select: { name: true } },
          createdByMember: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should use custom limit and offset', async () => {
      await AttributionService.getAttributionHistory(mockFamilyId, 20, 10);

      expect(mockPrisma.paymentAttribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 10,
        })
      );
    });

    it('should handle attribution without creator (system)', async () => {
      const systemAttribution = [{
        id: 'attr-system',
        amount: new Decimal(400),
        attributionType: 'automatic' as const,
        createdAt: new Date('2024-01-18'),
        payment: { payee: 'Insurance' },
        incomeEvent: { name: 'Refund' },
        createdByMember: null,
      }];

      mockPrisma.paymentAttribution.findMany.mockResolvedValue(systemAttribution as any);

      const result = await AttributionService.getAttributionHistory(mockFamilyId);

      expect(result[0].createdByName).toBe('System');
    });
  });
});