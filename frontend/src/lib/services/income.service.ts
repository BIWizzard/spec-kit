import { prisma } from '../prisma';
import { IncomeEvent, Prisma } from '@prisma/client';

export type CreateIncomeEventData = {
  name: string;
  amount: number;
  scheduledDate: Date;
  frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  source?: string;
  notes?: string;
};

export type UpdateIncomeEventData = {
  name?: string;
  amount?: number;
  scheduledDate?: Date;
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  source?: string;
  notes?: string;
};

export type MarkReceivedData = {
  actualDate: Date;
  actualAmount: number;
};

export type IncomeEventFilters = {
  status?: 'scheduled' | 'received' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  search?: string;
};

export class IncomeService {
  static async createIncomeEvent(familyId: string, data: CreateIncomeEventData): Promise<IncomeEvent> {
    const nextOccurrence = this.calculateNextOccurrence(data.scheduledDate, data.frequency);

    const incomeEvent = await prisma.incomeEvent.create({
      data: {
        familyId,
        name: data.name,
        amount: new Prisma.Decimal(data.amount),
        scheduledDate: data.scheduledDate,
        frequency: data.frequency,
        nextOccurrence,
        allocatedAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(data.amount),
        status: 'scheduled',
        source: data.source,
        notes: data.notes,
      },
    });

    await this.logAuditEvent(familyId, 'create', 'IncomeEvent', incomeEvent.id, {}, {
      name: data.name,
      amount: data.amount,
      scheduledDate: data.scheduledDate,
    });

    return incomeEvent;
  }

  static async getIncomeEvents(
    familyId: string,
    filters?: IncomeEventFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<IncomeEvent[]> {
    const where: Prisma.IncomeEventWhereInput = {
      familyId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) where.scheduledDate.gte = filters.startDate;
      if (filters.endDate) where.scheduledDate.lte = filters.endDate;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.incomeEvent.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  static async getIncomeEventById(familyId: string, incomeEventId: string): Promise<IncomeEvent | null> {
    return prisma.incomeEvent.findFirst({
      where: {
        id: incomeEventId,
        familyId,
      },
    });
  }

  static async updateIncomeEvent(
    familyId: string,
    incomeEventId: string,
    data: UpdateIncomeEventData
  ): Promise<IncomeEvent> {
    const existingEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
    });

    if (!existingEvent) {
      throw new Error('Income event not found');
    }

    if (existingEvent.status === 'received') {
      throw new Error('Cannot update received income event');
    }

    const updateData: Prisma.IncomeEventUpdateInput = {};
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      oldValues.name = existingEvent.name;
      newValues.name = data.name;
    }

    if (data.amount !== undefined) {
      const newAmount = new Prisma.Decimal(data.amount);
      const allocatedAmount = existingEvent.allocatedAmount;

      if (newAmount.lessThan(allocatedAmount)) {
        throw new Error('Cannot reduce amount below already allocated amount');
      }

      updateData.amount = newAmount;
      updateData.remainingAmount = newAmount.minus(allocatedAmount);
      oldValues.amount = existingEvent.amount;
      newValues.amount = data.amount;
    }

    if (data.scheduledDate !== undefined) {
      updateData.scheduledDate = data.scheduledDate;
      oldValues.scheduledDate = existingEvent.scheduledDate;
      newValues.scheduledDate = data.scheduledDate;
    }

    if (data.frequency !== undefined) {
      updateData.frequency = data.frequency;
      if (data.scheduledDate !== undefined) {
        updateData.nextOccurrence = this.calculateNextOccurrence(data.scheduledDate, data.frequency);
      } else {
        updateData.nextOccurrence = this.calculateNextOccurrence(existingEvent.scheduledDate, data.frequency);
      }
      oldValues.frequency = existingEvent.frequency;
      newValues.frequency = data.frequency;
    }

    if (data.source !== undefined) {
      updateData.source = data.source;
      oldValues.source = existingEvent.source;
      newValues.source = data.source;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
      oldValues.notes = existingEvent.notes;
      newValues.notes = data.notes;
    }

    const updatedEvent = await prisma.incomeEvent.update({
      where: { id: incomeEventId },
      data: updateData,
    });

    await this.logAuditEvent(familyId, 'update', 'IncomeEvent', incomeEventId, oldValues, newValues);

    return updatedEvent;
  }

  static async deleteIncomeEvent(familyId: string, incomeEventId: string): Promise<void> {
    const existingEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
      include: {
        paymentAttributions: true,
        budgetAllocations: true,
      },
    });

    if (!existingEvent) {
      throw new Error('Income event not found');
    }

    if (existingEvent.paymentAttributions.length > 0) {
      throw new Error('Cannot delete income event with existing payment attributions');
    }

    await prisma.$transaction(async (tx) => {
      await tx.budgetAllocation.deleteMany({
        where: { incomeEventId },
      });

      await tx.incomeEvent.delete({
        where: { id: incomeEventId },
      });
    });

    await this.logAuditEvent(familyId, 'delete', 'IncomeEvent', incomeEventId, {
      name: existingEvent.name,
      amount: existingEvent.amount,
      scheduledDate: existingEvent.scheduledDate,
    }, {});
  }

  static async markAsReceived(
    familyId: string,
    incomeEventId: string,
    data: MarkReceivedData
  ): Promise<IncomeEvent> {
    const existingEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
    });

    if (!existingEvent) {
      throw new Error('Income event not found');
    }

    if (existingEvent.status === 'received') {
      throw new Error('Income event already marked as received');
    }

    if (existingEvent.status === 'cancelled') {
      throw new Error('Cannot mark cancelled income event as received');
    }

    const updatedEvent = await prisma.incomeEvent.update({
      where: { id: incomeEventId },
      data: {
        actualDate: data.actualDate,
        actualAmount: new Prisma.Decimal(data.actualAmount),
        status: 'received',
        remainingAmount: new Prisma.Decimal(data.actualAmount).minus(existingEvent.allocatedAmount),
      },
    });

    if (existingEvent.frequency !== 'once') {
      await this.createNextOccurrence(existingEvent);
    }

    await this.logAuditEvent(familyId, 'update', 'IncomeEvent', incomeEventId,
      { status: 'scheduled' },
      {
        status: 'received',
        actualDate: data.actualDate,
        actualAmount: data.actualAmount,
      }
    );

    return updatedEvent;
  }

  static async revertReceived(familyId: string, incomeEventId: string): Promise<IncomeEvent> {
    const existingEvent = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
    });

    if (!existingEvent) {
      throw new Error('Income event not found');
    }

    if (existingEvent.status !== 'received') {
      throw new Error('Income event is not marked as received');
    }

    const updatedEvent = await prisma.incomeEvent.update({
      where: { id: incomeEventId },
      data: {
        actualDate: null,
        actualAmount: null,
        status: 'scheduled',
        remainingAmount: existingEvent.amount.minus(existingEvent.allocatedAmount),
      },
    });

    await this.logAuditEvent(familyId, 'update', 'IncomeEvent', incomeEventId,
      {
        status: 'received',
        actualDate: existingEvent.actualDate,
        actualAmount: existingEvent.actualAmount,
      },
      { status: 'scheduled' }
    );

    return updatedEvent;
  }

  static async getUpcomingIncomeEvents(familyId: string, days: number = 30): Promise<IncomeEvent[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return prisma.incomeEvent.findMany({
      where: {
        familyId,
        status: 'scheduled',
        scheduledDate: {
          gte: new Date(),
          lte: endDate,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  static async getIncomeSummary(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalScheduled: number;
    totalReceived: number;
    count: number;
    receivedCount: number;
  }> {
    const events = await prisma.incomeEvent.findMany({
      where: {
        familyId,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalScheduled = events.reduce((sum, event) => sum + Number(event.amount), 0);
    const receivedEvents = events.filter(e => e.status === 'received');
    const totalReceived = receivedEvents.reduce((sum, event) => sum + Number(event.actualAmount || 0), 0);

    return {
      totalScheduled,
      totalReceived,
      count: events.length,
      receivedCount: receivedEvents.length,
    };
  }

  static async bulkCreateIncomeEvents(
    familyId: string,
    events: CreateIncomeEventData[]
  ): Promise<IncomeEvent[]> {
    const createdEvents: IncomeEvent[] = [];

    for (const eventData of events) {
      const event = await this.createIncomeEvent(familyId, eventData);
      createdEvents.push(event);
    }

    await this.logAuditEvent(familyId, 'create', 'IncomeEvent', 'bulk', {}, {
      count: events.length,
      events: events.map(e => ({ name: e.name, amount: e.amount })),
    });

    return createdEvents;
  }

  static async getIncomeEventAttributions(familyId: string, incomeEventId: string) {
    const event = await prisma.incomeEvent.findFirst({
      where: { id: incomeEventId, familyId },
      include: {
        paymentAttributions: {
          include: {
            payment: {
              select: {
                id: true,
                payee: true,
                amount: true,
                dueDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new Error('Income event not found');
    }

    return event.paymentAttributions;
  }

  private static calculateNextOccurrence(scheduledDate: Date, frequency: string): Date {
    const nextDate = new Date(scheduledDate);

    switch (frequency) {
      case 'once':
        return scheduledDate;
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
        return scheduledDate;
    }

    return nextDate;
  }

  private static async createNextOccurrence(currentEvent: IncomeEvent): Promise<IncomeEvent> {
    const nextDate = this.calculateNextOccurrence(currentEvent.scheduledDate, currentEvent.frequency);

    return prisma.incomeEvent.create({
      data: {
        familyId: currentEvent.familyId,
        name: currentEvent.name,
        amount: currentEvent.amount,
        scheduledDate: nextDate,
        frequency: currentEvent.frequency,
        nextOccurrence: this.calculateNextOccurrence(nextDate, currentEvent.frequency),
        allocatedAmount: new Prisma.Decimal(0),
        remainingAmount: currentEvent.amount,
        status: 'scheduled',
        source: currentEvent.source,
        notes: currentEvent.notes,
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