import { NextRequest, NextResponse } from 'next/server';
import { IncomeService, UpdateIncomeEventData } from '../../../../lib/services/income.service';
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

export interface UpdateIncomeEventRequest {
  name?: string;
  amount?: number;
  scheduledDate?: string;
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  source?: string;
  notes?: string;
}

export interface UpdateIncomeEventResponse {
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
    source: string | null;
    notes: string | null;
    updatedAt: string;
  };
}

// T523: PUT /api/income-events/[id] - Update income event endpoint migration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as UpdateIncomeEventRequest;
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
    const {
      name,
      amount,
      scheduledDate,
      frequency,
      source,
      notes,
    } = body;

    // Validate provided fields
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({
        error: 'Invalid name',
        message: 'Name must be a non-empty string.',
      }, { status: 400 });
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number.',
      }, { status: 400 });
    }

    if (scheduledDate !== undefined && typeof scheduledDate !== 'string') {
      return NextResponse.json({
        error: 'Invalid scheduled date',
        message: 'Scheduled date must be a string in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    if (frequency !== undefined && !['once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
      return NextResponse.json({
        error: 'Invalid frequency',
        message: 'Frequency must be one of: once, weekly, biweekly, monthly, quarterly, annual.',
      }, { status: 400 });
    }

    if (source !== undefined && typeof source !== 'string') {
      return NextResponse.json({
        error: 'Invalid source',
        message: 'Source must be a string.',
      }, { status: 400 });
    }

    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json({
        error: 'Invalid notes',
        message: 'Notes must be a string.',
      }, { status: 400 });
    }

    // Parse and validate scheduled date if provided
    let parsedScheduledDate: Date | undefined;
    if (scheduledDate !== undefined) {
      try {
        parsedScheduledDate = new Date(scheduledDate);
        if (isNaN(parsedScheduledDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return NextResponse.json({
          error: 'Invalid scheduled date format',
          message: 'Scheduled date must be in YYYY-MM-DD format.',
        }, { status: 400 });
      }
    }

    try {
      // Create update data
      const updateData: UpdateIncomeEventData = {};

      if (name !== undefined) updateData.name = name.trim();
      if (amount !== undefined) updateData.amount = amount;
      if (parsedScheduledDate !== undefined) updateData.scheduledDate = parsedScheduledDate;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (source !== undefined) updateData.source = source.trim() || null;
      if (notes !== undefined) updateData.notes = notes.trim() || null;

      // Update the income event
      const incomeEvent = await IncomeService.updateIncomeEvent(familyId, incomeEventId, updateData);

      const response: UpdateIncomeEventResponse = {
        message: 'Income event updated successfully.',
        incomeEvent: {
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
          updatedAt: incomeEvent.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Update income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return NextResponse.json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Cannot update received income event') {
          return NextResponse.json({
            error: 'Cannot update received income event',
            message: 'Cannot update an income event that has already been marked as received.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Cannot reduce amount below already allocated amount') {
          return NextResponse.json({
            error: 'Cannot reduce amount',
            message: 'Cannot reduce amount below already allocated amount.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to update income event',
        message: 'Failed to update income event. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Update income event endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to update income event. Please try again.',
    }, { status: 500 });
  }
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

// T545: DELETE /api/income-events/[id] - Delete income event endpoint migration
export async function DELETE(
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
      // Delete the income event
      await IncomeService.deleteIncomeEvent(familyId, incomeEventId);

      return NextResponse.json({
        message: 'Income event deleted successfully.',
      }, { status: 200 });
    } catch (serviceError) {
      console.error('Delete income event error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return NextResponse.json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Cannot delete received income event') {
          return NextResponse.json({
            error: 'Cannot delete received income event',
            message: 'Cannot delete an income event that has already been marked as received.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Cannot delete income event with attributions') {
          return NextResponse.json({
            error: 'Cannot delete income event with attributions',
            message: 'Cannot delete an income event that has payments attributed to it.',
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        error: 'Failed to delete income event',
        message: 'Failed to delete income event. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Delete income event endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to delete income event. Please try again.',
    }, { status: 500 });
  }
}