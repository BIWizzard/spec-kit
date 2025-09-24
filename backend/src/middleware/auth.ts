import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
    permissions: {
      canManageBankAccounts: boolean;
      canEditPayments: boolean;
      canViewReports: boolean;
      canManageFamily: boolean;
    };
  };
}

export interface JWTPayload {
  userId: string;
  familyId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Authentication token is required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    if (!decoded.userId || !decoded.familyId || !decoded.email) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is missing required claims.',
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      familyId: decoded.familyId,
      email: decoded.email,
      role: decoded.role,
      permissions: {
        canManageBankAccounts: false,
        canEditPayments: false,
        canViewReports: false,
        canManageFamily: false,
      },
    };

    next();
  } catch (jwtError) {
    if (jwtError instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'The provided token has expired. Please refresh your session.',
      });
    }

    if (jwtError instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is malformed or invalid.',
      });
    }

    console.error('JWT verification error:', jwtError);

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Token verification failed. Please try logging in again.',
    });
  }
}

export function requirePermission(permission: keyof AuthenticatedRequest['user']['permissions']) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Authentication is required for this endpoint.',
      });
    }

    try {
      // Fetch fresh user permissions from database
      const user = await UserService.getUserById(req.user.id);

      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'The authenticated user was not found.',
        });
      }

      // Update request user with current permissions
      req.user.permissions = user.permissions;

      if (!req.user.permissions[permission]) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `You do not have permission to perform this action. Required: ${permission}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);

      return res.status(500).json({
        error: 'Permission check failed',
        message: 'Failed to verify user permissions. Please try again.',
      });
    }
  };
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Authentication is required for this endpoint.',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: 'Insufficient role',
        message: `This action requires ${role} role. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }

  // Token provided, verify it
  authenticateToken(req, res, next);
}