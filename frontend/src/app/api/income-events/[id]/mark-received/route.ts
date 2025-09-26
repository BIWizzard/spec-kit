import { NextRequest, NextResponse } from 'next/server';
import { IncomeService, MarkReceivedData } from '../../../../../lib/services/income.service';
import jwt from 'jsonwebtoken';

export interface MarkReceivedRequest {
  actualDate: string;
  actualAmount: number;
}

export interface MarkReceivedResponse {
  message: string;
  incomeEvent: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    actualDate: string;
    actualAmount: number;
    frequency: string;
    nextOccurrence: string;
    allocatedAmount: number;
    remainingAmount: number;
    status: string;
    source: string | null;
    notes: string | null;
    updatedAt: string;
  };
}

// T546: POST /api/income-events/[id]/mark-received - Mark income event as received endpoint migration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as MarkReceivedRequest;
    const { id: incomeEventId } = params;

    // Validate income event ID
    if (!incomeEventId || typeof incomeEventId !== 'string') {
      return NextResponse.json({
        error: 'Invalid income event ID',
        message: 'Income event ID is required and must be a valid string.',
      }, { status: 400 });
    }

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
    const { actualDate, actualAmount } = body;

    // Validate required fields
    if (!actualDate || typeof actualDate !== 'string') {
      return NextResponse.json({
        error: 'Invalid actual date',
        message: 'Actual date is required and must be a string in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    if (!actualAmount || typeof actualAmount !== 'number' || actualAmount <= 0) {
      return NextResponse.json({
        error: 'Invalid actual amount',
        message: 'Actual amount is required and must be a positive number.',
      }, { status: 400 });
    }

    // Parse and validate actual date
    let parsedActualDate: Date;
    try {
      parsedActualDate = new Date(actualDate);
      if (isNaN(parsedActualDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      return NextResponse.json({
        error: 'Invalid actual date format',
        message: 'Actual date must be in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    try {
      // Create mark received data
      const markReceivedData: MarkReceivedData = {
        actualDate: parsedActualDate,
        actualAmount: actualAmount,
      };

      // Mark the income event as received
      const incomeEvent = await IncomeService.markIncomeReceived(familyId, incomeEventId, markReceivedData);

      const response: MarkReceivedResponse = {
        message: 'Income event marked as received successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          name: incomeEvent.name,
          amount: incomeEvent.amount.toNumber(),
          scheduledDate: incomeEvent.scheduledDate.toISOString().split('T')[0],
          actualDate: incomeEvent.actualDate!.toISOString().split('T')[0],
          actualAmount: incomeEvent.actualAmount!.toNumber(),
          frequency: incomeEvent.frequency,
          nextOccurrence: incomeEvent.nextOccurrence.toISOString().split('T')[0],
          allocatedAmount: incomeEvent.allocatedAmount.toNumber(),
          remainingAmount: incomeEvent.remainingAmount.toNumber(),
          status: incomeEvent.status,
          source: incomeEvent.source,
          notes: incomeEvent.notes,
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Mark income received error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return NextResponse.json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Income event already marked as received') {
          return NextResponse.json({
            error: 'Income event already received',
            message: 'This income event has already been marked as received.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Cannot mark cancelled income event as received') {
          return NextResponse.json({
            error: 'Cannot mark cancelled income event',
            message: 'Cannot mark a cancelled income event as received.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to mark income event as received',
        message: 'Failed to mark income event as received. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Mark income received endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to mark income event as received. Please try again.',
    }, { status: 500 });
  }
}