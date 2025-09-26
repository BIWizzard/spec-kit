import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { IncomeService, IncomeEventFilters } from '@/lib/services/income.service';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract JWT token from Authorization header
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const familyId = decoded.familyId;
    if (!familyId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No family access' },
        { status: 403 }
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