import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  userId: string;
  familyId: string;
  email: string;
  role: string;
}

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function validateToken(token: string): AuthenticatedUser {
  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded.userId || !decoded.familyId || !decoded.email) {
      throw new AuthenticationError('Invalid token payload');
    }

    return {
      userId: decoded.userId,
      familyId: decoded.familyId,
      email: decoded.email,
      role: decoded.role || 'member',
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    }
    throw new AuthenticationError('Authentication failed');
  }
}

export function authenticateRequest(request: NextRequest): AuthenticatedUser {
  const token = extractToken(request);

  if (!token) {
    throw new AuthenticationError('Authorization token required');
  }

  return validateToken(token);
}