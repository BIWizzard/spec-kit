import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '../../../../../lib/services/user.service';
import jwt from 'jsonwebtoken';

export interface DeleteSessionResponse {
  message: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Missing session ID',
          message: 'Session ID is required in the URL path.',
        },
        { status: 400 }
      );
    }

    // Extract user from JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'No token provided',
          message: 'Authentication token is required.',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'The provided token is invalid.',
          },
          { status: 401 }
        );
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'The provided token is invalid or expired.',
        },
        { status: 401 }
      );
    }

    try {
      // Delete specific session
      await UserService.deleteSession(sessionId, userId);

      const response: DeleteSessionResponse = {
        message: 'Session terminated successfully.',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Delete session error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Session not found') {
          return NextResponse.json(
            {
              error: 'Session not found',
              message: 'The specified session was not found or does not belong to you.',
            },
            { status: 404 }
          );
        }

        if (serviceError.message === 'User not found') {
          return NextResponse.json(
            {
              error: 'User not found',
              message: 'The user account was not found.',
            },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to delete session',
          message: 'Failed to delete the session. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete session endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete the session. Please try again.',
      },
      { status: 500 }
    );
  }
}