import { NextRequest, NextResponse } from 'next/server';
import { IncomeService } from '@/lib/services/income.service';

export interface UpcomingIncomeEventsResponse {
  incomeEvents: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    frequency: string;
    status: string;
    source?: string;
    notes?: string;
    allocatedAmount: number;
    remainingAmount: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // Extract familyId from request headers (set by auth middleware)
    const familyId = request.headers.get('x-family-id');

    if (!familyId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Family ID not found in request headers.',
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'Days parameter must be a number between 1 and 365.',
        },
        { status: 400 }
      );
    }

    // Get upcoming income events
    const incomeEvents = await IncomeService.getUpcomingIncomeEvents(familyId, days);

    const response: UpcomingIncomeEventsResponse = {
      incomeEvents: incomeEvents.map(event => ({
        id: event.id,
        name: event.name,
        amount: Number(event.amount),
        scheduledDate: event.scheduledDate.toISOString(),
        frequency: event.frequency,
        status: event.status,
        source: event.source || undefined,
        notes: event.notes || undefined,
        allocatedAmount: Number(event.allocatedAmount),
        remainingAmount: Number(event.remainingAmount),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Get upcoming income events error:', error);

    if (error instanceof Error) {
      if (error.message.includes('Family not found')) {
        return NextResponse.json(
          {
            error: 'Family not found',
            message: 'The specified family does not exist.',
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve upcoming income events. Please try again.',
      },
      { status: 500 }
    );
  }
}