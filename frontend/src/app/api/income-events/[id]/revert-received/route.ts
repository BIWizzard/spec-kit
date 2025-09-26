import { NextRequest, NextResponse } from 'next/server';
import { IncomeService } from '../../../../../lib/services/income.service';
import jwt from 'jsonwebtoken';

export interface RevertReceivedResponse {
  message: string;
  incomeEvent: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    actualDate: null;
    actualAmount: null;
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

// T547: POST /api/income-events/[id]/revert-received - Revert income event received status endpoint migration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    try {
      // Revert the income event received status
      const incomeEvent = await IncomeService.revertIncomeReceived(familyId, incomeEventId);

      const response: RevertReceivedResponse = {
        message: 'Income event received status reverted successfully.',
        incomeEvent: {
          id: incomeEvent.id,
          name: incomeEvent.name,
          amount: incomeEvent.amount.toNumber(),
          scheduledDate: incomeEvent.scheduledDate.toISOString().split('T')[0],
          actualDate: null,
          actualAmount: null,
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
      console.error('Revert income received error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return NextResponse.json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Income event is not marked as received') {
          return NextResponse.json({
            error: 'Income event not received',
            message: 'This income event is not currently marked as received.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Cannot revert income event with attributions') {
          return NextResponse.json({
            error: 'Cannot revert income event with attributions',
            message: 'Cannot revert an income event that has payments attributed to it.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to revert income event received status',
        message: 'Failed to revert income event received status. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Revert income received endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to revert income event received status. Please try again.',
    }, { status: 500 });
  }
}