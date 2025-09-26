import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { IncomeService, IncomeEventFilters, CreateIncomeEventData } from '@/lib/services/income.service';
import { ValidationService } from '@/lib/services/validation.service';

export interface GetIncomeEventsResponse {
  incomeEvents: Array<{
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    source?: string;
    notes?: string;
    status: 'scheduled' | 'received' | 'cancelled';
    actualDate?: string;
    actualAmount?: number;
    allocatedAmount: number;
    remainingAmount: number;
    nextOccurrence?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface CreateIncomeEventRequest {
  name: string;
  amount: number;
  scheduledDate: string;
  frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  source?: string;
  notes?: string;
}

interface CreateIncomeEventResponse {
  message: string;
  incomeEvent: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    frequency: string;
    nextOccurrence: string;
    allocatedAmount: number;
    remainingAmount: number;
    status: string;
    source?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
}

async function extractUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.familyId) {
      throw new Error('Invalid token');
    }

    return {
      familyId: decoded.familyId,
      userId: decoded.userId,
    };
  } catch (jwtError) {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract user from JWT token
    let familyId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: IncomeEventFilters = {};

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as 'scheduled' | 'received' | 'cancelled';
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }

    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    // Get income events from service
    const incomeEvents = await IncomeService.getIncomeEvents(familyId, filters, limit, offset);

    // Get total count for pagination (we'll fetch one extra to check if there are more)
    const hasMoreEvents = await IncomeService.getIncomeEvents(familyId, filters, 1, offset + limit);
    const hasMore = hasMoreEvents.length > 0;

    // Format response
    const response: GetIncomeEventsResponse = {
      incomeEvents: incomeEvents.map(event => ({
        id: event.id,
        name: event.name,
        amount: Number(event.amount),
        scheduledDate: event.scheduledDate.toISOString(),
        frequency: event.frequency as 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
        source: event.source || undefined,
        notes: event.notes || undefined,
        status: event.status as 'scheduled' | 'received' | 'cancelled',
        actualDate: event.actualDate?.toISOString(),
        actualAmount: event.actualAmount ? Number(event.actualAmount) : undefined,
        allocatedAmount: Number(event.allocatedAmount),
        remainingAmount: Number(event.remainingAmount),
        nextOccurrence: event.nextOccurrence?.toISOString(),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      })),
      pagination: {
        total: incomeEvents.length, // Note: This is not the actual total, but the current page count
        limit,
        offset,
        hasMore,
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get income events error:', error);

    if (error instanceof Error) {
      // Handle specific database errors
      if (error.message.includes('Family not found')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Family not found' },
          { status: 404 }
        );
      }

      // Handle validation errors
      if (error.message.includes('Invalid date')) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid date format in query parameters' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to retrieve income events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, amount, scheduledDate, frequency, source, notes }: CreateIncomeEventRequest = body;

    // Extract user from JWT token
    let familyId: string;
    let userId: string;
    try {
      const tokenData = await extractUserFromToken(request);
      familyId = tokenData.familyId;
      userId = tokenData.userId;
    } catch (tokenError) {
      return NextResponse.json(
        {
          error: 'Authentication error',
          message: tokenError.message === 'No token provided'
            ? 'Authentication token is required.'
            : 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    // Convert string date to Date object
    const parsedScheduledDate = new Date(scheduledDate);
    if (isNaN(parsedScheduledDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: [{ field: 'scheduledDate', message: 'Invalid date format' }],
        },
        { status: 400 }
      );
    }

    // Validate input
    const incomeEventData: CreateIncomeEventData = {
      name,
      amount,
      scheduledDate: parsedScheduledDate,
      frequency,
      source,
      notes,
    };

    const validationErrors = ValidationService.validateIncomeEventCreate(incomeEventData);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    try {
      // Create income event
      const incomeEvent = await IncomeService.createIncomeEvent(familyId, incomeEventData);

      const response: CreateIncomeEventResponse = {
        message: 'Income event created successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          name: incomeEvent.name,
          amount: Number(incomeEvent.amount),
          scheduledDate: incomeEvent.scheduledDate.toISOString(),
          frequency: incomeEvent.frequency,
          nextOccurrence: incomeEvent.nextOccurrence.toISOString(),
          allocatedAmount: Number(incomeEvent.allocatedAmount),
          remainingAmount: Number(incomeEvent.remainingAmount),
          status: incomeEvent.status,
          source: incomeEvent.source || undefined,
          notes: incomeEvent.notes || undefined,
          createdAt: incomeEvent.createdAt.toISOString(),
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 201 });
    } catch (serviceError) {
      console.error('Create income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('duplicate') || serviceError.message.includes('unique')) {
          return NextResponse.json(
            {
              error: 'Duplicate income event',
              message: 'An income event with this name already exists for the scheduled date.',
            },
            { status: 409 }
          );
        }

        if (serviceError.message.includes('Family not found')) {
          return NextResponse.json(
            {
              error: 'Family not found',
              message: 'The family was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to create income event',
          message: 'Failed to create income event. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Create income event endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create income event. Please try again.',
      },
      { status: 500 }
    );
  }
}