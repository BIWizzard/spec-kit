import { NextRequest, NextResponse } from 'next/server';
import { IncomeService } from '../../../../lib/services/income.service';
import jwt from 'jsonwebtoken';

export interface IncomeEventDetailsResponse {
  incomeEvent: {
    id: string;
    name: string;
    amount: number;
    scheduledDate: string;
    actualDate?: string;
    actualAmount?: number;
    frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    nextOccurrence: string;
    allocatedAmount: number;
    remainingAmount: number;
    status: 'scheduled' | 'received' | 'cancelled';
    source?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      const { id: incomeEventId } = params;

      // Validate income event ID
      if (!incomeEventId) {
        return NextResponse.json({
          error: 'Missing income event ID',
          message: 'Income event ID is required.',
        }, { status: 400 });
      }

      // Get income event details from service
      const incomeEvent = await IncomeService.getIncomeEventById(decoded.familyId, incomeEventId);

      if (!incomeEvent) {
        return NextResponse.json({
          error: 'Income event not found',
          message: 'The requested income event does not exist or you do not have access to it.',
        }, { status: 404 });
      }

      // Format response with all income event details
      const response: IncomeEventDetailsResponse = {
        incomeEvent: {
          id: incomeEvent.id,
          name: incomeEvent.name,
          amount: Number(incomeEvent.amount),
          scheduledDate: incomeEvent.scheduledDate.toISOString(),
          actualDate: incomeEvent.actualDate?.toISOString(),
          actualAmount: incomeEvent.actualAmount ? Number(incomeEvent.actualAmount) : undefined,
          frequency: incomeEvent.frequency as 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
          nextOccurrence: incomeEvent.nextOccurrence.toISOString(),
          allocatedAmount: Number(incomeEvent.allocatedAmount),
          remainingAmount: Number(incomeEvent.remainingAmount),
          status: incomeEvent.status as 'scheduled' | 'received' | 'cancelled',
          source: incomeEvent.source || undefined,
          notes: incomeEvent.notes || undefined,
          createdAt: incomeEvent.createdAt.toISOString(),
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });

    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
        }, { status: 401 });
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      throw jwtError; // Re-throw unexpected errors
    }
  } catch (error) {
    console.error('Income event details error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to retrieve income event details. Please try again.',
    }, { status: 500 });
  }
}