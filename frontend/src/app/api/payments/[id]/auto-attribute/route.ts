import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../../../../../lib/services/payment.service';
import jwt from 'jsonwebtoken';

export interface AutoAttributeResponse {
  message: string;
  attributionsCreated: number;
}

// T538: POST /api/payments/[id]/auto-attribute - Auto-attribute payment to income endpoint migration
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
      // Auto-attribute payments to income events
      const attributionsCreated = await PaymentService.autoAttributePayments(familyId);

      const response: AutoAttributeResponse = {
        message: `Auto-attribution completed successfully. ${attributionsCreated} attribution(s) created.`,
        attributionsCreated,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Auto-attribute payments error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return NextResponse.json({
            error: 'Family not found',
            message: 'The family was not found.',
          }, { status: 404 });
        }

        if (serviceError.message === 'No unattributed payments found') {
          return NextResponse.json({
            error: 'No unattributed payments',
            message: 'No unattributed payments found to auto-attribute.',
          }, { status: 404 });
        }

        if (serviceError.message === 'No income events available') {
          return NextResponse.json({
            error: 'No income events',
            message: 'No income events available for attribution.',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        error: 'Failed to auto-attribute payments',
        message: 'Failed to auto-attribute payments. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Auto-attribute payments endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to auto-attribute payments. Please try again.',
    }, { status: 500 });
  }
}