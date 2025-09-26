import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user.service';
import jwt from 'jsonwebtoken';

export interface LogoutResponse {
  message: string;
}

export async function POST(request: NextRequest) {
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
      // Verify and decode the JWT token to get session information
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.sessionId) {
        return NextResponse.json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        }, { status: 401 });
      }

      // Get session token from database to invalidate
      const session = await UserService.getSessionById(decoded.sessionId);
      if (session) {
        await UserService.logout(session.token);
      }

      const response: LogoutResponse = {
        message: 'Logout successful',
      };

      return NextResponse.json(response, { status: 200 });
    } catch (jwtError) {
      // Token might be expired or invalid, but we still want to attempt logout
      // Try to extract session info from the token without verification
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.sessionId) {
          const session = await UserService.getSessionById(decoded.sessionId);
          if (session) {
            await UserService.logout(session.token);
          }
        }
      } catch (decodeError) {
        // If we can't decode, just return success anyway
        console.warn('Could not decode token for logout:', decodeError);
      }

      const response: LogoutResponse = {
        message: 'Logout successful',
      };

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('Logout error:', error);

    // Even if there's an error, we should still return success for logout
    // This prevents client-side issues with invalid tokens
    const response: LogoutResponse = {
      message: 'Logout successful',
    };

    return NextResponse.json(response, { status: 200 });
  }
}