import { prisma } from '../prisma';
import { Payment, PaymentAttribution, Prisma } from '@prisma/client';

export type CreatePaymentData = {
  payee: string;
  amount: number;
  dueDate: Date;
  paymentType: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId: string;
  autoPayEnabled?: boolean;
  notes?: string;
};

export type UpdatePaymentData = {
  payee?: string;
  amount?: number;
  dueDate?: Date;
  paymentType?: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId?: string;
  autoPayEnabled?: boolean;
  notes?: string;
};

export type MarkPaidData = {
  paidDate: Date;
  paidAmount: number;
};

export type PaymentFilters = {
  status?: 'scheduled' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  startDate?: Date;
  endDate?: Date;
  spendingCategoryId?: string;
  paymentType?: 'once' | 'recurring' | 'variable';
  search?: string;
  overdueOnly?: boolean;
};

export type AttributeToIncomeData = {
  incomeEventId: string;
  amount: number;
  attributionType: 'manual' | 'automatic';
};

export class PaymentService {
  static async createPayment(familyId: string, data: CreatePaymentData): Promise<Payment> {
    const spendingCategory = await prisma.spendingCategory.findFirst({
      where: {
        id: data.spendingCategoryId,
        familyId,
        isActive: true,
      },
    });

    if (!spendingCategory) {
      throw new Error('Invalid spending category');
    }

    const nextDueDate = data.paymentType === 'once'
      ? data.dueDate
      : this.calculateNextDueDate(data.dueDate, data.frequency || 'monthly');

    const payment = await prisma.payment.create({
      data: {
        familyId,
        payee: data.payee,
        amount: new Prisma.Decimal(data.amount),
        dueDate: data.dueDate,
        paymentType: data.paymentType,
        frequency: data.frequency || 'once',
        nextDueDate,
        status: 'scheduled',
        spendingCategoryId: data.spendingCategoryId,
        autoPayEnabled: data.autoPayEnabled || false,
        notes: data.notes,
      },
    });

    await this.logAuditEvent(familyId, 'create', 'Payment', payment.id, {}, {
      payee: data.payee,
      amount: data.amount,
      dueDate: data.dueDate,
      spendingCategoryId: data.spendingCategoryId,
    });

    return payment;
  }

  static async getPayments(
    familyId: string,
    filters?: PaymentFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<Payment[]> {
    const where: Prisma.PaymentWhereInput = {
      familyId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.overdueOnly) {
      where.status = 'overdue';
      where.dueDate = { lt: new Date() };
    }

    if (filters?.startDate || filters?.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = filters.startDate;
      if (filters.endDate) where.dueDate.lte = filters.endDate;
    }

    if (filters?.spendingCategoryId) {
      where.spendingCategoryId = filters.spendingCategoryId;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    if (filters?.search) {
      where.OR = [
        { payee: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.payment.findMany({
      where,
      include: {
        spendingCategory: {
          select: {
            name: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  static async getPaymentById(familyId: string, paymentId: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: {
        id: paymentId,
        familyId,
      },
      include: {
        spendingCategory: true,
        paymentAttributions: {
          include: {
            incomeEvent: {
              select: {
                id: true,
                name: true,
                scheduledDate: true,
                amount: true,
              },
            },
          },
        },
      },
    });
  }

  static async updatePayment(
    familyId: string,
    paymentId: string,
    data: UpdatePaymentData
  ): Promise<Payment> {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    if (existingPayment.status === 'paid') {
      throw new Error('Cannot update paid payment');
    }

    const updateData: Prisma.PaymentUpdateInput = {};
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (data.payee !== undefined) {
      updateData.payee = data.payee;
      oldValues.payee = existingPayment.payee;
      newValues.payee = data.payee;
    }

    if (data.amount !== undefined) {
      const newAmount = new Prisma.Decimal(data.amount);
      updateData.amount = newAmount;
      oldValues.amount = existingPayment.amount;
      newValues.amount = data.amount;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
      updateData.nextDueDate = data.paymentType === 'once'
        ? data.dueDate
        : this.calculateNextDueDate(data.dueDate, data.frequency || existingPayment.frequency);
      oldValues.dueDate = existingPayment.dueDate;
      newValues.dueDate = data.dueDate;
    }

    if (data.paymentType !== undefined) {
      updateData.paymentType = data.paymentType;
      oldValues.paymentType = existingPayment.paymentType;
      newValues.paymentType = data.paymentType;
    }

    if (data.frequency !== undefined) {
      updateData.frequency = data.frequency;
      oldValues.frequency = existingPayment.frequency;
      newValues.frequency = data.frequency;
    }

    if (data.spendingCategoryId !== undefined) {
      const spendingCategory = await prisma.spendingCategory.findFirst({
        where: {
          id: data.spendingCategoryId,
          familyId,
          isActive: true,
        },
      });

      if (!spendingCategory) {
        throw new Error('Invalid spending category');
      }

      updateData.spendingCategoryId = data.spendingCategoryId;
      oldValues.spendingCategoryId = existingPayment.spendingCategoryId;
      newValues.spendingCategoryId = data.spendingCategoryId;
    }

    if (data.autoPayEnabled !== undefined) {
      updateData.autoPayEnabled = data.autoPayEnabled;
      oldValues.autoPayEnabled = existingPayment.autoPayEnabled;
      newValues.autoPayEnabled = data.autoPayEnabled;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
      oldValues.notes = existingPayment.notes;
      newValues.notes = data.notes;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
    });

    await this.logAuditEvent(familyId, 'update', 'Payment', paymentId, oldValues, newValues);

    return updatedPayment;
  }

  static async deletePayment(familyId: string, paymentId: string): Promise<void> {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
      include: { paymentAttributions: true },
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentAttribution.deleteMany({
        where: { paymentId },
      });

      await tx.payment.delete({
        where: { id: paymentId },
      });
    });

    await this.logAuditEvent(familyId, 'delete', 'Payment', paymentId, {
      payee: existingPayment.payee,
      amount: existingPayment.amount,
      dueDate: existingPayment.dueDate,
    }, {});
  }

  static async markAsPaid(
    familyId: string,
    paymentId: string,
    data: MarkPaidData
  ): Promise<Payment> {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    if (existingPayment.status === 'paid') {
      throw new Error('Payment already marked as paid');
    }

    if (existingPayment.status === 'cancelled') {
      throw new Error('Cannot mark cancelled payment as paid');
    }

    const status = data.paidAmount >= Number(existingPayment.amount) ? 'paid' : 'partial';

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paidDate: data.paidDate,
        paidAmount: new Prisma.Decimal(data.paidAmount),
        status,
      },
    });

    if (existingPayment.paymentType === 'recurring') {
      await this.createNextOccurrence(existingPayment);
    }

    await this.logAuditEvent(familyId, 'update', 'Payment', paymentId,
      { status: existingPayment.status },
      {
        status,
        paidDate: data.paidDate,
        paidAmount: data.paidAmount,
      }
    );

    return updatedPayment;
  }

  static async revertPaid(familyId: string, paymentId: string): Promise<Payment> {
    const existingPayment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
    });

    if (!existingPayment) {
      throw new Error('Payment not found');
    }

    if (existingPayment.status !== 'paid' && existingPayment.status !== 'partial') {
      throw new Error('Payment is not marked as paid');
    }

    const status = existingPayment.dueDate < new Date() ? 'overdue' : 'scheduled';

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paidDate: null,
        paidAmount: null,
        status,
      },
    });

    await this.logAuditEvent(familyId, 'update', 'Payment', paymentId,
      {
        status: existingPayment.status,
        paidDate: existingPayment.paidDate,
        paidAmount: existingPayment.paidAmount,
      },
      { status }
    );

    return updatedPayment;
  }

  static async attributeToIncome(
    familyId: string,
    paymentId: string,
    data: AttributeToIncomeData,
    memberId: string
  ): Promise<PaymentAttribution> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, familyId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const incomeEvent = await tx.incomeEvent.findFirst({
        where: { id: data.incomeEventId, familyId },
      });

      if (!incomeEvent) {
        throw new Error('Income event not found');
      }

      const existingAttributions = await tx.paymentAttribution.findMany({
        where: { paymentId },
      });

      const totalAttributed = existingAttributions.reduce(
        (sum, attr) => sum + Number(attr.amount), 0
      );

      if (totalAttributed + data.amount > Number(payment.amount)) {
        throw new Error('Attribution amount exceeds payment amount');
      }

      if (data.amount > Number(incomeEvent.remainingAmount)) {
        throw new Error('Attribution amount exceeds available income');
      }

      const attribution = await tx.paymentAttribution.create({
        data: {
          paymentId,
          incomeEventId: data.incomeEventId,
          amount: new Prisma.Decimal(data.amount),
          attributionType: data.attributionType,
          createdBy: memberId,
        },
      });

      await tx.incomeEvent.update({
        where: { id: data.incomeEventId },
        data: {
          allocatedAmount: {
            increment: data.amount,
          },
          remainingAmount: {
            decrement: data.amount,
          },
        },
      });

      return attribution;
    });
  }

  static async removeAttribution(
    familyId: string,
    paymentId: string,
    attributionId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const attribution = await tx.paymentAttribution.findFirst({
        where: {
          id: attributionId,
          paymentId,
          payment: { familyId },
        },
        include: { incomeEvent: true },
      });

      if (!attribution) {
        throw new Error('Attribution not found');
      }

      await tx.paymentAttribution.delete({
        where: { id: attributionId },
      });

      await tx.incomeEvent.update({
        where: { id: attribution.incomeEventId },
        data: {
          allocatedAmount: {
            decrement: Number(attribution.amount),
          },
          remainingAmount: {
            increment: Number(attribution.amount),
          },
        },
      });
    });
  }

  static async getUpcomingPayments(familyId: string, days: number = 30): Promise<Payment[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.payment.findMany({
      where: {
        familyId,
        status: 'scheduled',
        dueDate: {
          gte: new Date(),
          lte: endDate,
        },
      },
      include: {
        spendingCategory: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  static async getOverduePayments(familyId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: {
        familyId,
        status: { in: ['scheduled', 'partial'] },
        dueDate: { lt: new Date() },
      },
      include: {
        spendingCategory: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  static async getPaymentSummary(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalScheduled: number;
    totalPaid: number;
    count: number;
    paidCount: number;
    overdueCount: number;
  }> {
    const payments = await prisma.payment.findMany({
      where: {
        familyId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalScheduled = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const paidPayments = payments.filter(p => p.status === 'paid');
    const totalPaid = paidPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
    const overdueCount = payments.filter(p => p.status === 'overdue').length;

    return {
      totalScheduled,
      totalPaid,
      count: payments.length,
      paidCount: paidPayments.length,
      overdueCount,
    };
  }

  static async bulkCreatePayments(
    familyId: string,
    payments: CreatePaymentData[]
  ): Promise<Payment[]> {
    const createdPayments: Payment[] = [];

    for (const paymentData of payments) {
      const payment = await this.createPayment(familyId, paymentData);
      createdPayments.push(payment);
    }

    await this.logAuditEvent(familyId, 'create', 'Payment', 'bulk', {}, {
      count: payments.length,
      payments: payments.map(p => ({ payee: p.payee, amount: p.amount })),
    });

    return createdPayments;
  }

  static async autoAttributePayments(familyId: string): Promise<number> {
    const unattributedPayments = await prisma.payment.findMany({
      where: {
        familyId,
        status: 'scheduled',
        paymentAttributions: {
          none: {},
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const availableIncomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        status: 'scheduled',
        remainingAmount: { gt: 0 },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    let attributedCount = 0;

    for (const payment of unattributedPayments) {
      const paymentAmount = Number(payment.amount);

      for (const income of availableIncomeEvents) {
        const availableAmount = Number(income.remainingAmount);

        if (availableAmount >= paymentAmount) {
          try {
            await this.attributeToIncome(familyId, payment.id, {
              incomeEventId: income.id,
              amount: paymentAmount,
              attributionType: 'automatic',
            }, '');

            attributedCount++;
            income.remainingAmount = new Prisma.Decimal(availableAmount - paymentAmount);
            break;
          } catch (error) {
            continue;
          }
        }
      }
    }

    return attributedCount;
  }

  private static calculateNextDueDate(dueDate: Date, frequency: string): Date {
    const nextDate = new Date(dueDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return dueDate;
    }

    return nextDate;
  }

  private static async createNextOccurrence(currentPayment: Payment): Promise<Payment> {
    const nextDate = this.calculateNextDueDate(currentPayment.dueDate, currentPayment.frequency);

    return prisma.payment.create({
      data: {
        familyId: currentPayment.familyId,
        payee: currentPayment.payee,
        amount: currentPayment.amount,
        dueDate: nextDate,
        paymentType: currentPayment.paymentType,
        frequency: currentPayment.frequency,
        nextDueDate: this.calculateNextDueDate(nextDate, currentPayment.frequency),
        status: 'scheduled',
        spendingCategoryId: currentPayment.spendingCategoryId,
        autoPayEnabled: currentPayment.autoPayEnabled,
        notes: currentPayment.notes,
      },
    });
  }

  private static async logAuditEvent(
    familyId: string,
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    oldValues: object,
    newValues: object
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        familyId,
        familyMemberId: '',
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress: '',
      },
    });
  }
}