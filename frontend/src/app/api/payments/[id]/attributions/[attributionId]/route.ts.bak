import { NextRequest, NextResponse } from 'next/server';
import { AttributionService } from '@/lib/services/attribution.service';
import { verifyJWT } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; attributionId: string } }
) {
  try {
    const authResult = await verifyJWT(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, userId } = authResult.payload;
    const { attributionId } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.amount) {
      return NextResponse.json(
        { error: 'Missing required field: amount' },
        { status: 400 }
      );
    }

    const attribution = await AttributionService.updateAttribution(
      familyId,
      attributionId,
      { amount: data.amount },
      userId
    );

    return NextResponse.json(attribution);
  } catch (error) {
    console.error('Error updating payment attribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attributionId: string } }
) {
  try {
    const authResult = await verifyJWT(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, userId } = authResult.payload;
    const { attributionId } = params;

    await AttributionService.deleteAttribution(familyId, attributionId, userId);

    return NextResponse.json({ message: 'Attribution deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment attribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}