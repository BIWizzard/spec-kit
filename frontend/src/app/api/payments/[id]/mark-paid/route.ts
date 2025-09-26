import { NextRequest, NextResponse } from 'next/server';
import { PaymentService, MarkPaidData } from '../../../../../lib/services/payment.service';
import jwt from 'jsonwebtoken';

export interface MarkPaidRequest {
  paidDate: string;
  paidAmount: number;
}

export interface MarkPaidResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    paidDate: string;
    paidAmount: number;
    status: string;
    updatedAt: string;
  };
}

// T536: POST /api/payments/[id]/mark-paid - Mark payment as paid endpoint migration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as MarkPaidRequest;
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
    const { paidDate, paidAmount } = body;

    // Validate required fields
    if (!paidDate || typeof paidDate !== 'string') {
      return NextResponse.json({
        error: 'Invalid paid date',
        message: 'Paid date is required and must be a string in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    if (typeof paidAmount !== 'number' || paidAmount <= 0) {
      return NextResponse.json({
        error: 'Invalid paid amount',
        message: 'Paid amount must be a positive number.',
      }, { status: 400 });
    }

    // Parse and validate paid date
    let parsedPaidDate: Date;
    try {
      parsedPaidDate = new Date(paidDate);
      if (isNaN(parsedPaidDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      return NextResponse.json({
        error: 'Invalid paid date format',
        message: 'Paid date must be in YYYY-MM-DD format.',
      }, { status: 400 });
    }

    try {
      // Create mark paid data
      const markPaidData: MarkPaidData = {
        paidDate: parsedPaidDate,
        paidAmount,
      };

      // Mark payment as paid
      const payment = await PaymentService.markAsPaid(familyId, paymentId, markPaidData);

      const response: MarkPaidResponse = {
        message: 'Payment marked as paid successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          paidDate: payment.paidDate!.toISOString().split('T')[0],
          paidAmount: payment.paidAmount!.toNumber(),
          status: payment.status,
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Mark payment as paid error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return NextResponse.json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Payment already paid') {
          return NextResponse.json({
            error: 'Payment already paid',
            message: 'The payment has already been marked as paid.',
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
        error: 'Failed to mark payment as paid',
        message: 'Failed to mark payment as paid. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Mark payment as paid endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to mark payment as paid. Please try again.',
    }, { status: 500 });
  }
}