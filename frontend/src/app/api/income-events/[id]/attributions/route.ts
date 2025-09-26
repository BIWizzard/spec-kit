import { NextRequest, NextResponse } from 'next/server';
import { AttributionService } from '../../../../../lib/services/attribution.service';
import jwt from 'jsonwebtoken';

export interface IncomeAttributionsResponse {
  attributions: Array<{
    id: string;
    paymentId: string;
    paymentName: string;
    paymentDate: string;
    amount: number;
    attributionType: string;
    createdAt: string;
  }>;
  summary: {
    totalAttributed: number;
    totalAttributions: number;
  };
}

// T548: GET /api/income-events/[id]/attributions - Get income event attributions endpoint migration
export async function GET(
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
      // Get income event attributions from service
      const attributions = await AttributionService.getIncomeAttributions(familyId, incomeEventId);

      // Calculate summary
      const totalAttributed = attributions.reduce((sum, attr) => sum + Number(attr.amount), 0);
      const totalAttributions = attributions.length;

      const response: IncomeAttributionsResponse = {
        attributions: attributions.map(attribution => ({
          id: attribution.id,
          paymentId: attribution.paymentId,
          paymentName: attribution.payment.name,
          paymentDate: attribution.payment.date.toISOString().split('T')[0],
          amount: Number(attribution.amount),
          attributionType: attribution.attributionType,
          createdAt: attribution.createdAt.toISOString(),
        })),
        summary: {
          totalAttributed,
          totalAttributions,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get income attributions error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Income event not found') {
          return NextResponse.json({
            error: 'Income event not found',
            message: 'The income event was not found.',
          }, { status: 404 });
        }
      }

      return NextResponse.json({
        error: 'Failed to get income event attributions',
        message: 'Failed to get income event attributions. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Get income attributions endpoint error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to get income event attributions. Please try again.',
    }, { status: 500 });
  }
}