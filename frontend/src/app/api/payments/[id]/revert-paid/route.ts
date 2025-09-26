import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../../../../../lib/services/payment.service';
import jwt from 'jsonwebtoken';

export interface RevertPaidResponse {
  message: string;
  payment: {
    id: string;
    payee: string;
    amount: number;
    dueDate: string;
    status: string;
    updatedAt: string;
  };
}

// T537: POST /api/payments/[id]/revert-paid - Revert payment paid status endpoint migration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    try {
      // Revert payment paid status
      const payment = await PaymentService.revertPaid(familyId, paymentId);

      const response: RevertPaidResponse = {
        message: 'Payment status reverted to scheduled successfully.',
        payment: {
          id: payment.id,
          payee: payment.payee,
          amount: payment.amount.toNumber(),
          dueDate: payment.dueDate.toISOString().split('T')[0],
          status: payment.status,
          updatedAt: payment.updatedAt.toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Revert payment paid status error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Payment not found') {
          return NextResponse.json({
            error: 'Payment not found',
            message: 'The payment was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'Payment not paid') {
          return NextResponse.json({
            error: 'Payment not paid',
            message: 'The payment is not currently marked as paid.',
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
        error: 'Failed to revert payment status',
        message: 'Failed to revert payment status. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Revert payment paid status endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to revert payment status. Please try again.',
    }, { status: 500 });
  }
}