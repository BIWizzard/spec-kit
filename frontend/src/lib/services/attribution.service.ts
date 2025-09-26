import { prisma } from '../prisma';
import { PaymentAttribution, Prisma } from '@prisma/client';

export type CreateAttributionData = {
  paymentId: string;
  incomeEventId: string;
  amount: number;
  attributionType: 'manual' | 'automatic';
};

export type UpdateAttributionData = {
  amount: number;
};

export type SplitPaymentData = {
  paymentId: string;
  attributions: Array<{
    incomeEventId: string;
    amount: number;
  }>;
  attributionType: 'manual' | 'automatic';
};

export type AttributionSummary = {
  totalAttributed: number;
  remainingAmount: number;
  attributions: Array<{
    id: string;
    incomeEventName: string;
    incomeEventDate: Date;
    amount: number;
    percentage: number;
  }>;
};

export class AttributionService {
  static async createAttribution(
    familyId: string,
    data: CreateAttributionData,
    createdBy: string
  ): Promise<PaymentAttribution> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: data.paymentId, familyId },
        include: {
          paymentAttributions: true,
        },
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

      const existingAttributions = payment.paymentAttributions;
      const totalAttributed = existingAttributions.reduce(
        (sum, attr) => sum + Number(attr.amount), 0
      );

      if (totalAttributed + data.amount > Number(payment.amount)) {
        throw new Error('Attribution amount exceeds payment amount');
      }

      if (data.amount > Number(incomeEvent.remainingAmount)) {
        throw new Error('Attribution amount exceeds available income');
      }

      if (data.amount <= 0) {
        throw new Error('Attribution amount must be positive');
      }

      const attribution = await tx.paymentAttribution.create({
        data: {
          paymentId: data.paymentId,
          incomeEventId: data.incomeEventId,
          amount: new Prisma.Decimal(data.amount),
          attributionType: data.attributionType,
          createdBy,
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

      await this.logAuditEvent(familyId, createdBy, 'create', 'PaymentAttribution', attribution.id, {}, {
        paymentId: data.paymentId,
        incomeEventId: data.incomeEventId,
        amount: data.amount,
        attributionType: data.attributionType,
      });

      return attribution;
    });
  }

  static async updateAttribution(
    familyId: string,
    attributionId: string,
    data: UpdateAttributionData,
    updatedBy: string
  ): Promise<PaymentAttribution> {
    return prisma.$transaction(async (tx) => {
      const attribution = await tx.paymentAttribution.findFirst({
        where: {
          id: attributionId,
          payment: { familyId },
        },
        include: {
          payment: {
            include: {
              paymentAttributions: true,
            },
          },
          incomeEvent: true,
        },
      });

      if (!attribution) {
        throw new Error('Attribution not found');
      }

      const currentAmount = Number(attribution.amount);
      const amountDifference = data.amount - currentAmount;

      if (amountDifference !== 0) {
        const otherAttributions = attribution.payment.paymentAttributions.filter(
          attr => attr.id !== attributionId
        );
        const otherAttributedAmount = otherAttributions.reduce(
          (sum, attr) => sum + Number(attr.amount), 0
        );

        if (otherAttributedAmount + data.amount > Number(attribution.payment.amount)) {
          throw new Error('Updated attribution amount exceeds payment amount');
        }

        const availableIncome = Number(attribution.incomeEvent.remainingAmount) + currentAmount;
        if (data.amount > availableIncome) {
          throw new Error('Updated attribution amount exceeds available income');
        }
      }

      const updatedAttribution = await tx.paymentAttribution.update({
        where: { id: attributionId },
        data: {
          amount: new Prisma.Decimal(data.amount),
        },
      });

      if (amountDifference !== 0) {
        await tx.incomeEvent.update({
          where: { id: attribution.incomeEventId },
          data: {
            allocatedAmount: {
              increment: amountDifference,
            },
            remainingAmount: {
              decrement: amountDifference,
            },
          },
        });
      }

      await this.logAuditEvent(familyId, updatedBy, 'update', 'PaymentAttribution', attributionId,
        { amount: currentAmount },
        { amount: data.amount }
      );

      return updatedAttribution;
    });
  }

  static async deleteAttribution(
    familyId: string,
    attributionId: string,
    deletedBy: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const attribution = await tx.paymentAttribution.findFirst({
        where: {
          id: attributionId,
          payment: { familyId },
        },
        include: {
          payment: true,
          incomeEvent: true,
        },
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

      await this.logAuditEvent(familyId, deletedBy, 'delete', 'PaymentAttribution', attributionId, {
        paymentId: attribution.paymentId,
        incomeEventId: attribution.incomeEventId,
        amount: Number(attribution.amount),
      }, {});
    });
  }

  static async splitPaymentAcrossIncome(
    familyId: string,
    data: SplitPaymentData,
    createdBy: string
  ): Promise<PaymentAttribution[]> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: data.paymentId, familyId },
        include: { paymentAttributions: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentAttributions.length > 0) {
        throw new Error('Payment already has attributions. Delete existing attributions first.');
      }

      const totalAttributionAmount = data.attributions.reduce((sum, attr) => sum + attr.amount, 0);

      if (totalAttributionAmount !== Number(payment.amount)) {
        throw new Error('Total attribution amounts must equal payment amount');
      }

      const attributions: PaymentAttribution[] = [];

      for (const attrData of data.attributions) {
        const incomeEvent = await tx.incomeEvent.findFirst({
          where: { id: attrData.incomeEventId, familyId },
        });

        if (!incomeEvent) {
          throw new Error(`Income event not found: ${attrData.incomeEventId}`);
        }

        if (attrData.amount > Number(incomeEvent.remainingAmount)) {
          throw new Error(`Attribution amount exceeds available income for ${incomeEvent.name}`);
        }

        const attribution = await tx.paymentAttribution.create({
          data: {
            paymentId: data.paymentId,
            incomeEventId: attrData.incomeEventId,
            amount: new Prisma.Decimal(attrData.amount),
            attributionType: data.attributionType,
            createdBy,
          },
        });

        await tx.incomeEvent.update({
          where: { id: attrData.incomeEventId },
          data: {
            allocatedAmount: {
              increment: attrData.amount,
            },
            remainingAmount: {
              decrement: attrData.amount,
            },
          },
        });

        attributions.push(attribution);
      }

      await this.logAuditEvent(familyId, createdBy, 'create', 'PaymentAttribution', 'split', {}, {
        paymentId: data.paymentId,
        splitCount: data.attributions.length,
        totalAmount: totalAttributionAmount,
        attributions: data.attributions,
      });

      return attributions;
    });
  }

  static async getPaymentAttributions(
    familyId: string,
    paymentId: string
  ): Promise<AttributionSummary> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
      include: {
        paymentAttributions: {
          include: {
            incomeEvent: {
              select: {
                name: true,
                scheduledDate: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const totalPaymentAmount = Number(payment.amount);
    const totalAttributed = payment.paymentAttributions.reduce(
      (sum, attr) => sum + Number(attr.amount), 0
    );

    const attributions = payment.paymentAttributions.map(attr => ({
      id: attr.id,
      incomeEventName: attr.incomeEvent.name,
      incomeEventDate: attr.incomeEvent.scheduledDate,
      amount: Number(attr.amount),
      percentage: (Number(attr.amount) / totalPaymentAmount) * 100,
    }));

    return {
      totalAttributed,
      remainingAmount: totalPaymentAmount - totalAttributed,
      attributions,
    };
  }

  static async getIncomeAttributions(
    familyId: string,
    incomeEventId: string
  ): Promise<{
    totalAttributed: number;
    remainingAmount: number;
    attributions: Array<{
      id: string;
      paymentPayee: string;
      paymentDueDate: Date;
      amount: number;
      percentage: number;
    }>;
  }> {
    const incomeEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
      include: {
        paymentAttributions: {
          include: {
            payment: {
              select: {
                payee: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!incomeEvent) {
      throw new Error('Income event not found');
    }

    const totalIncomeAmount = Number(incomeEvent.amount);
    const totalAttributed = Number(incomeEvent.allocatedAmount);

    const attributions = incomeEvent.paymentAttributions.map(attr => ({
      id: attr.id,
      paymentPayee: attr.payment.payee,
      paymentDueDate: attr.payment.dueDate,
      amount: Number(attr.amount),
      percentage: (Number(attr.amount) / totalIncomeAmount) * 100,
    }));

    return {
      totalAttributed,
      remainingAmount: Number(incomeEvent.remainingAmount),
      attributions,
    };
  }

  static async autoAttributePayment(
    familyId: string,
    paymentId: string,
    createdBy: string
  ): Promise<PaymentAttribution | null> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
      include: { paymentAttributions: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.paymentAttributions.length > 0) {
      throw new Error('Payment already has attributions');
    }

    const paymentAmount = Number(payment.amount);

    const availableIncomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        status: 'scheduled',
        remainingAmount: { gte: paymentAmount },
        scheduledDate: { lte: payment.dueDate },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 1,
    });

    if (availableIncomeEvents.length === 0) {
      return null;
    }

    const selectedIncome = availableIncomeEvents[0];

    return this.createAttribution(familyId, {
      paymentId,
      incomeEventId: selectedIncome.id,
      amount: paymentAmount,
      attributionType: 'automatic',
    }, createdBy);
  }

  static async suggestAttributions(
    familyId: string,
    paymentId: string
  ): Promise<Array<{
    incomeEventId: string;
    incomeEventName: string;
    scheduledDate: Date;
    availableAmount: number;
    suggestedAmount: number;
    confidence: 'high' | 'medium' | 'low';
  }>> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const paymentAmount = Number(payment.amount);

    const availableIncomeEvents = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        status: 'scheduled',
        remainingAmount: { gt: 0 },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    const suggestions = availableIncomeEvents.map(income => {
      const availableAmount = Number(income.remainingAmount);
      const suggestedAmount = Math.min(paymentAmount, availableAmount);

      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (income.scheduledDate <= payment.dueDate && availableAmount >= paymentAmount) {
        confidence = 'high';
      } else if (availableAmount >= paymentAmount * 0.5) {
        confidence = 'medium';
      }

      return {
        incomeEventId: income.id,
        incomeEventName: income.name,
        scheduledDate: income.scheduledDate,
        availableAmount,
        suggestedAmount,
        confidence,
      };
    });

    return suggestions.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  static async validateAttributionCapacity(
    familyId: string,
    paymentId: string,
    proposedAttributions: Array<{ incomeEventId: string; amount: number }>
  ): Promise<{
    isValid: boolean;
    errors: string[];
    totalProposed: number;
    paymentAmount: number;
  }> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, familyId },
      include: { paymentAttributions: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const errors: string[] = [];
    const paymentAmount = Number(payment.amount);
    const existingAttributed = payment.paymentAttributions.reduce(
      (sum, attr) => sum + Number(attr.amount), 0
    );

    const totalProposed = proposedAttributions.reduce((sum, attr) => sum + attr.amount, 0);
    const totalWithExisting = existingAttributed + totalProposed;

    if (totalWithExisting > paymentAmount) {
      errors.push('Total attributions exceed payment amount');
    }

    for (const attr of proposedAttributions) {
      const incomeEvent = await prisma.incomeEvent.findFirst({
        where: { id: attr.incomeEventId, familyId },
      });

      if (!incomeEvent) {
        errors.push(`Income event not found: ${attr.incomeEventId}`);
        continue;
      }

      if (attr.amount > Number(incomeEvent.remainingAmount)) {
        errors.push(`Amount ${attr.amount} exceeds available income for ${incomeEvent.name}`);
      }

      if (attr.amount <= 0) {
        errors.push('Attribution amounts must be positive');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalProposed,
      paymentAmount,
    };
  }

  static async getAttributionHistory(
    familyId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    paymentPayee: string;
    incomeEventName: string;
    amount: number;
    attributionType: 'manual' | 'automatic';
    createdAt: Date;
    createdByName: string;
  }>> {
    const attributions = await prisma.paymentAttribution.findMany({
      where: {
        payment: { familyId },
      },
      include: {
        payment: {
          select: { payee: true },
        },
        incomeEvent: {
          select: { name: true },
        },
        createdByMember: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return attributions.map(attr => ({
      id: attr.id,
      paymentPayee: attr.payment.payee,
      incomeEventName: attr.incomeEvent.name,
      amount: Number(attr.amount),
      attributionType: attr.attributionType,
      createdAt: attr.createdAt,
      createdByName: attr.createdByMember
        ? `${attr.createdByMember.firstName} ${attr.createdByMember.lastName}`
        : 'System',
    }));
  }

  private static async logAuditEvent(
    familyId: string,
    memberId: string,
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    oldValues: object,
    newValues: object
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        familyId,
        familyMemberId: memberId,
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