import { NextRequest, NextResponse } from 'next/server';
import { AttributionService } from '@/lib/services/attribution.service';
import { verifyJWT } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyJWT(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = authResult.payload;
    const paymentId = params.id;

    const attributions = await AttributionService.getPaymentAttributions(
      familyId,
      paymentId
    );

    return NextResponse.json(attributions);
  } catch (error) {
    console.error('Error fetching payment attributions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyJWT(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, userId } = authResult.payload;
    const paymentId = params.id;
    const data = await request.json();

    // Validate required fields
    if (!data.incomeEventId || !data.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: incomeEventId, amount' },
        { status: 400 }
      );
    }

    const attribution = await AttributionService.createAttribution(
      familyId,
      {
        paymentId,
        incomeEventId: data.incomeEventId,
        amount: data.amount,
        attributionType: data.attributionType || 'manual'
      },
      userId
    );

    return NextResponse.json(attribution, { status: 201 });
  } catch (error) {
    console.error('Error creating payment attribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}