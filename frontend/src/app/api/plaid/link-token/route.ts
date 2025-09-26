import { NextRequest, NextResponse } from 'next/server';
import { BankService } from '@/lib/services/bank.service';
import jwt from 'jsonwebtoken';

export interface CreateLinkTokenResponse {
  linkToken: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        },
        { status: 401 }
      );
    }

    // Extract and verify JWT token
    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    const { familyId, userId } = decoded;
    if (!familyId || !userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token payload',
        },
        { status: 401 }
      );
    }

    // Create Plaid link token
    const linkToken = await BankService.createLinkToken(familyId, userId);

    const response: CreateLinkTokenResponse = {
      linkToken,
      message: 'Link token created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Plaid link token creation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not authorized')) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: error.message,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('permissions') || error.message.includes('Insufficient')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: error.message,
          },
          { status: 403 }
        );
      }

      if (error.message.includes('Plaid') || error.message.includes('link token')) {
        return NextResponse.json(
          {
            error: 'Plaid Error',
            message: error.message,
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create link token. Please try again.',
      },
      { status: 500 }
    );
  }
}