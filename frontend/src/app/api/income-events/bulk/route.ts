import { NextRequest, NextResponse } from 'next/server';
import { IncomeService, CreateIncomeEventData } from '../../../../lib/services/income.service';
import jwt from 'jsonwebtoken';

export interface BulkIncomeEventRequest {
  incomeEvents: Array<{
    name: string;
    amount: number;
    scheduledDate: string;
    frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    source?: string;
    notes?: string;
  }>;
}

export interface BulkIncomeEventResponse {
  message: string;
  incomeEvents: Array<{
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    frequency: string;
    nextOccurrence: string;
    allocatedAmount: number;
    remainingAmount: number;
    status: string;
    source: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  summary: {
    created: number;
    totalAmount: number;
  };
}

// T549: POST /api/income-events/bulk - Create bulk income events endpoint migration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BulkIncomeEventRequest;

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      familyId = decoded.familyId;
    } catch (jwtError) {
      return NextResponse.json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      }, { status: 401 });
    }

    // Extract and validate request body
    const { incomeEvents } = body;

    // Validate income events array
    if (!incomeEvents || !Array.isArray(incomeEvents) || incomeEvents.length === 0) {
      return NextResponse.json({
        error: 'Invalid income events',
        message: 'Income events array is required and must contain at least one item.',
      }, { status: 400 });
    }

    if (incomeEvents.length > 50) {
      return NextResponse.json({
        error: 'Too many income events',
        message: 'Cannot create more than 50 income events at once.',
      }, { status: 400 });
    }

    // Validate each income event
    const validatedIncomeEvents: CreateIncomeEventData[] = [];

    for (let i = 0; i < incomeEvents.length; i++) {
      const event = incomeEvents[i];

      // Validate required fields
      if (!event.name || typeof event.name !== 'string' || event.name.trim().length === 0) {
        return NextResponse.json({
          error: `Invalid name for income event ${i + 1}`,
          message: `Name is required and must be a non-empty string for income event ${i + 1}.`,
        }, { status: 400 });
      }

      if (!event.amount || typeof event.amount !== 'number' || event.amount <= 0) {
        return NextResponse.json({
          error: `Invalid amount for income event ${i + 1}`,
          message: `Amount must be a positive number for income event ${i + 1}.`,
        }, { status: 400 });
      }

      if (!event.scheduledDate || typeof event.scheduledDate !== 'string') {
        return NextResponse.json({
          error: `Invalid scheduled date for income event ${i + 1}`,
          message: `Scheduled date is required and must be a string in YYYY-MM-DD format for income event ${i + 1}.`,
        }, { status: 400 });
      }

      if (!event.frequency || !['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(event.frequency)) {
        return NextResponse.json({
          error: `Invalid frequency for income event ${i + 1}`,
          message: `Frequency must be one of: once, weekly, biweekly, monthly, quarterly, annual for income event ${i + 1}.`,
        }, { status: 400 });
      }

      // Validate optional fields
      if (event.source !== undefined && typeof event.source !== 'string') {
        return NextResponse.json({
          error: `Invalid source for income event ${i + 1}`,
          message: `Source must be a string for income event ${i + 1}.`,
        }, { status: 400 });
      }

      if (event.notes !== undefined && typeof event.notes !== 'string') {
        return NextResponse.json({
          error: `Invalid notes for income event ${i + 1}`,
          message: `Notes must be a string for income event ${i + 1}.`,
        }, { status: 400 });
      }

      // Parse and validate scheduled date
      let parsedScheduledDate: Date;
      try {
        parsedScheduledDate = new Date(event.scheduledDate);
        if (isNaN(parsedScheduledDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return NextResponse.json({
          error: `Invalid scheduled date format for income event ${i + 1}`,
          message: `Scheduled date must be in YYYY-MM-DD format for income event ${i + 1}.`,
        }, { status: 400 });
      }

      // Add validated income event
      validatedIncomeEvents.push({
        name: event.name.trim(),
        amount: event.amount,
        scheduledDate: parsedScheduledDate,
        frequency: event.frequency,
        source: event.source?.trim() || undefined,
        notes: event.notes?.trim() || undefined,
      });
    }

    try {
      // Create bulk income events
      const createdIncomeEvents = await IncomeService.createBulkIncomeEvents(familyId, validatedIncomeEvents);

      // Calculate summary
      const totalAmount = createdIncomeEvents.reduce((sum, event) => sum + Number(event.amount), 0);

      const response: BulkIncomeEventResponse = {
        message: `${createdIncomeEvents.length} income events created successfully.`,
        incomeEvents: createdIncomeEvents.map(incomeEvent => ({
          id: incomeEvent.id,
          name: incomeEvent.name,
          amount: incomeEvent.amount.toNumber(),
          scheduledDate: incomeEvent.scheduledDate.toISOString().split('T')[0],
          frequency: incomeEvent.frequency,
          nextOccurrence: incomeEvent.nextOccurrence.toISOString().split('T')[0],
          allocatedAmount: incomeEvent.allocatedAmount.toNumber(),
          remainingAmount: incomeEvent.remainingAmount.toNumber(),
          status: incomeEvent.status,
          source: incomeEvent.source,
          notes: incomeEvent.notes,
          createdAt: incomeEvent.createdAt.toISOString(),
        })),
        summary: {
          created: createdIncomeEvents.length,
          totalAmount,
        },
      };

      return NextResponse.json(response, { status: 201 });
    } catch (serviceError) {
      console.error('Create bulk income events error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return NextResponse.json({
            error: 'Family not found',
            message: 'The family was not found.',
          }, { status: 404 });
        }

        if (serviceError.message.includes('Duplicate income event name')) {
          return NextResponse.json({
            error: 'Duplicate income event name',
            message: 'One or more income events have duplicate names.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to create bulk income events',
        message: 'Failed to create bulk income events. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Create bulk income events endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create bulk income events. Please try again.',
    }, { status: 500 });
  }
}