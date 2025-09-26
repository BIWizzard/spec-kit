import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import jwt from 'jsonwebtoken';

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface SessionsListResponse {
  sessions: SessionInfo[];
}

export interface DeleteAllSessionsResponse {
  message: string;
  deletedCount: number;
}

export async function GET(request: NextRequest) {
  try {
    // Extract user from JWT token
    const authHeader = request.headers.get('Authorization');
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
    let currentSessionId: string | undefined;
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
      currentSessionId = decoded.sessionId;
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
      // Get all user sessions
      const sessions = await UserService.getUserSessions(userId);

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isCurrent: session.id === currentSessionId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }));

      const response: SessionsListResponse = {
        sessions: sessionInfos,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Get sessions error:', serviceError);

      if (serviceError instanceof Error) {
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
          error: 'Failed to get sessions',
          message: 'Failed to retrieve user sessions. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get sessions endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve user sessions. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract user from JWT token
    const authHeader = request.headers.get('Authorization');
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
      // Get count of current sessions before deletion
      const currentSessions = await UserService.getUserSessions(userId);
      const sessionCount = currentSessions.length;

      // Delete all user sessions
      await UserService.deleteAllSessions(userId);

      const response: DeleteAllSessionsResponse = {
        message: 'All sessions have been terminated successfully. You will need to log in again.',
        deletedCount: sessionCount,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (serviceError) {
      console.error('Delete all sessions error:', serviceError);

      if (serviceError instanceof Error) {
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
          error: 'Failed to delete sessions',
          message: 'Failed to delete user sessions. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete all sessions endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to delete user sessions. Please try again.',
      },
      { status: 500 }
    );
  }
}