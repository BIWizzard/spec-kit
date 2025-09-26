import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../../../../lib/services/payment.service';
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