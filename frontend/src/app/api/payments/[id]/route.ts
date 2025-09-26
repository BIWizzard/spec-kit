import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, UpdatePaymentData } from '../../../../lib/services/payment.service';
import jwt from 'jsonwebtoken';

export interface PaymentDetailsResponse {
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    paidAmount?: number;
    paymentType: 'once' | 'recurring' | 'variable';
    frequency: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    status: 'scheduled' | 'paid' | 'overdue' | 'cancelled' | 'partial';
    autoPayEnabled: boolean;
    notes?: string;
    spendingCategory: {
      id: string;
      name: string;
      color?: string;
      icon?: string;
    };
    paymentAttributions: Array<{
      id: string;
      amount: number;
      attributionType: 'manual' | 'automatic';
      incomeEvent: {
        id: string;
        name: string;
        scheduledDate: string;
        amount: number;
      };
    }>;
  };
}

export interface UpdatePaymentRequest {
  payee?: string;
  amount?: number;
  dueDate?: string;
  paymentType?: 'once' | 'recurring' | 'variable';
  frequency?: 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  spendingCategoryId?: string;
  autoPayEnabled?: boolean;
  notes?: string;
}

export interface UpdatePaymentResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    paymentType: string;
    frequency: string;
    nextDueDate: string | null;
    status: string;
    spendingCategoryId: string;
    autoPayEnabled: boolean;
    notes: string | null;
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

      const { id: paymentId } = params;

      // Validate payment ID
      if (!paymentId) {
        return NextResponse.json({
          error: 'Missing payment ID',
          message: 'Payment ID is required.',
        }, { status: 400 });
      }

      // Get payment details from service
      const payment = await PaymentService.getPaymentById(decoded.familyId, paymentId);

      if (!payment) {
        return NextResponse.json({
          error: 'Payment not found',
          message: 'The requested payment does not exist or you do not have access to it.',
        }, { status: 404 });
      }

      // Format response with all payment details including attributions
      const response: PaymentDetailsResponse = {
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: Number(payment.amount),
          dueDate: payment.dueDate.toISOString(),
          paidDate: payment.paidDate?.toISOString(),
          paidAmount: payment.paidAmount ? Number(payment.paidAmount) : undefined,
          paymentType: payment.paymentType as 'once' | 'recurring' | 'variable',
          frequency: payment.frequency as 'once' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual',
          status: payment.status as 'scheduled' | 'paid' | 'overdue' | 'cancelled' | 'partial',
          autoPayEnabled: payment.autoPayEnabled,
          notes: payment.notes || undefined,
          spendingCategory: {
            id: payment.spendingCategory.id,
            name: payment.spendingCategory.name,
            color: payment.spendingCategory.color || undefined,
            icon: payment.spendingCategory.icon || undefined,
          },
          paymentAttributions: payment.paymentAttributions.map(attr => ({
            id: attr.id,
            amount: Number(attr.amount),
            attributionType: attr.attributionType as 'manual' | 'automatic',
            incomeEvent: {
              id: attr.incomeEvent.id,
              name: attr.incomeEvent.name,
              scheduledDate: attr.incomeEvent.scheduledDate.toISOString(),
              amount: Number(attr.incomeEvent.amount),
            },
          })),
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
    console.error('Payment details error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to retrieve payment details. Please try again.',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as UpdatePaymentRequest;
    const { id: paymentId } = params;

    // Validate payment ID
    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json({
        error: 'Invalid payment ID',
        message: 'Payment ID is required and must be a valid string.',
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
      payee,
      amount,
      dueDate,
      paymentType,
      frequency,
      spendingCategoryId,
      autoPayEnabled,
      notes,
    } = body;

    // Validate provided fields
    if (payee !== undefined && (typeof payee !== 'string' || payee.trim().length === 0)) {
      return NextResponse.json({
        error: 'Invalid payee',
        message: 'Payee must be a non-empty string.',
      }, { status: 400 });
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number.',
      }, { status: 400 });
    }

    if (dueDate !== undefined && typeof dueDate !== 'string') {
      return NextResponse.json({
        error: 'Invalid due date',
        message: 'Due date must be a string in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    if (paymentType !== undefined && !['once', 'recurring', 'variable'].includes(paymentType)) {
      return NextResponse.json({
        error: 'Invalid payment type',
        message: 'Payment type must be one of: once, recurring, variable.',
      }, { status: 400 });
    }

    if (spendingCategoryId !== undefined && typeof spendingCategoryId !== 'string') {
      return NextResponse.json({
        error: 'Invalid spending category',
        message: 'Spending category ID must be a string.',
      }, { status: 400 });
    }

    // Parse and validate due date if provided
    let parsedDueDate: Date | undefined;
    if (dueDate !== undefined) {
      try {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return NextResponse.json({
          error: 'Invalid due date format',
          message: 'Due date must be in YYYY-MM-DD format.',
        }, { status: 400 });
      }
    }

    // Validate frequency for recurring payments
    if (paymentType === 'recurring' && frequency !== undefined) {
      if (!['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'].includes(frequency)) {
        return NextResponse.json({
          error: 'Invalid frequency',
          message: 'Frequency must be one of: weekly, biweekly, monthly, quarterly, annual.',
        }, { status: 400 });
      }
    }

    try {
      // Create update data
      const updateData: UpdatePaymentData = {};

      if (payee !== undefined) updateData.payee = payee.trim();
      if (amount !== undefined) updateData.amount = amount;
      if (parsedDueDate !== undefined) updateData.dueDate = parsedDueDate;
      if (paymentType !== undefined) updateData.paymentType = paymentType;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (spendingCategoryId !== undefined) updateData.spendingCategoryId = spendingCategoryId;
      if (autoPayEnabled !== undefined) updateData.autoPayEnabled = autoPayEnabled;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;

      // Update the payment
      const payment = await PaymentService.updatePayment(familyId, paymentId, updateData);

      const response: UpdatePaymentResponse = {
        message: 'Payment updated successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          paymentType: payment.paymentType,
          frequency: payment.frequency,
          nextDueDate: payment.nextDueDate ? payment.nextDueDate.toISOString().split('T')[0] : null,
          status: payment.status,
          spendingCategoryId: payment.spendingCategoryId,
          autoPayEnabled: payment.autoPayEnabled,
          notes: payment.notes,
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Update payment error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return NextResponse.json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Cannot update paid payment') {
          return NextResponse.json({
            error: 'Cannot update paid payment',
            message: 'Cannot update a payment that has already been marked as paid.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Invalid spending category') {
          return NextResponse.json({
            error: 'Invalid spending category',
            message: 'The specified spending category does not exist or is not active.',
          }, { status: 400 });
        }

        if (serviceError.message === 'Family not found') {
          return NextResponse.json({
            error: 'Family not found',
            message: 'The family was not found.',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        error: 'Failed to update payment',
        message: 'Failed to update payment. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Update payment endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to update payment. Please try again.',
    }, { status: 500 });
  }
}