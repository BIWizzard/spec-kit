import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, details?: any, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let details: any = undefined;

  // Generate request ID for tracking
  const requestId = req.get('X-Request-ID') || generateRequestId();

  try {
    // Handle custom AppError
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      details = error.details;
    }
    // Handle Prisma database errors
    else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const { code, message, meta } = error;

      switch (code) {
        case 'P2002': // Unique constraint violation
          statusCode = 409;
          errorMessage = 'A record with this data already exists';
          details = { constraint: meta?.target };
          break;

        case 'P2025': // Record not found
          statusCode = 404;
          errorMessage = 'The requested record was not found';
          break;

        case 'P2003': // Foreign key constraint violation
          statusCode = 400;
          errorMessage = 'Invalid reference to related record';
          details = { field: meta?.field_name };
          break;

        case 'P2014': // Required relation missing
          statusCode = 400;
          errorMessage = 'Required relationship is missing';
          break;

        default:
          statusCode = 500;
          errorMessage = 'Database operation failed';
          console.error('Prisma error:', { code, message, meta });
      }
    }
    // Handle Prisma validation errors
    else if (error instanceof Prisma.PrismaClientValidationError) {
      statusCode = 400;
      errorMessage = 'Invalid data provided to database';
    }
    // Handle JSON parsing errors
    else if (error instanceof SyntaxError && 'body' in error) {
      statusCode = 400;
      errorMessage = 'Invalid JSON in request body';
    }
    // Handle other known error types
    else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = error.message;
    }
    else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      errorMessage = 'Authentication required';
    }
    else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      errorMessage = 'Access denied';
    }
    // Handle generic errors
    else {
      // Log unexpected errors
      console.error('Unexpected error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        requestId,
        url: req.url,
        method: req.method,
      });

      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        errorMessage = 'An unexpected error occurred';
      } else {
        errorMessage = error.message;
        details = { stack: error.stack };
      }
    }

    const errorResponse: ErrorResponse = {
      error: getErrorType(statusCode),
      message: errorMessage,
      timestamp: new Date().toISOString(),
      requestId,
    };

    if (details) {
      errorResponse.details = details;
    }

    res.status(statusCode).json(errorResponse);
  } catch (handlingError) {
    // If error handling itself fails, send minimal response
    console.error('Error in error handler:', handlingError);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing the request',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404
  );

  next(error);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    return 'Client Error';
  }

  if (statusCode >= 500) {
    return 'Server Error';
  }

  return 'Error';
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Centralized error throwing functions
export const throwError = {
  badRequest: (message: string, details?: any) => {
    throw new AppError(message, 400, details);
  },

  unauthorized: (message: string = 'Authentication required') => {
    throw new AppError(message, 401);
  },

  forbidden: (message: string = 'Access denied') => {
    throw new AppError(message, 403);
  },

  notFound: (message: string = 'Resource not found') => {
    throw new AppError(message, 404);
  },

  conflict: (message: string, details?: any) => {
    throw new AppError(message, 409, details);
  },

  unprocessableEntity: (message: string, details?: any) => {
    throw new AppError(message, 422, details);
  },

  tooManyRequests: (message: string = 'Rate limit exceeded') => {
    throw new AppError(message, 429);
  },

  internal: (message: string = 'Internal server error') => {
    throw new AppError(message, 500);
  },
};