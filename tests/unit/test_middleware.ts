import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

// Import middleware functions
import {
  authenticateToken,
  requirePermission,
  requireRole,
  optionalAuth,
  AuthenticatedRequest,
  JWTPayload,
} from '../../backend/src/middleware/auth';

import {
  validateRequest,
  validateUuidParam,
  sanitizeInput,
  commonSchemas,
} from '../../backend/src/middleware/validation';

import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  throwError,
} from '../../backend/src/middleware/error-handler';

import {
  rateLimit,
  rateLimitPresets,
  RateLimitOptions,
} from '../../backend/src/middleware/rate-limit';

import { UserService } from '../../backend/src/services/user.service';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../backend/src/services/user.service');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('API Middleware - Unit Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      get: jest.fn(),
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      originalUrl: '/api/test',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    describe('authenticateToken', () => {
      test('should authenticate valid Bearer token', () => {
        const mockPayload: JWTPayload = {
          userId: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        (mockRequest.get as jest.Mock).mockReturnValue('Bearer valid-token');
        mockJwt.verify.mockReturnValue(mockPayload as any);

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRequest.user).toEqual({
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: false,
            canManageFamily: false,
          },
        });
      });

      test('should reject request without Authorization header', () => {
        (mockRequest.get as jest.Mock).mockReturnValue(undefined);

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'No token provided',
          message: 'Authentication token is required. Please provide a valid Bearer token.',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject non-Bearer authorization', () => {
        (mockRequest.get as jest.Mock).mockReturnValue('Basic invalid-auth');

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'No token provided',
          message: 'Authentication token is required. Please provide a valid Bearer token.',
        });
      });

      test('should handle expired JWT token', () => {
        (mockRequest.get as jest.Mock).mockReturnValue('Bearer expired-token');
        mockJwt.verify.mockImplementation(() => {
          throw new jwt.TokenExpiredError('Token expired', new Date());
        });

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Token expired',
          message: 'The provided token has expired. Please refresh your session.',
        });
      });

      test('should handle malformed JWT token', () => {
        (mockRequest.get as jest.Mock).mockReturnValue('Bearer malformed-token');
        mockJwt.verify.mockImplementation(() => {
          throw new jwt.JsonWebTokenError('Malformed token');
        });

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          message: 'The provided token is malformed or invalid.',
        });
      });

      test('should handle JWT with missing claims', () => {
        const incompletePayload = {
          userId: 'user-123',
          // Missing familyId and email
          role: 'admin',
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        (mockRequest.get as jest.Mock).mockReturnValue('Bearer incomplete-token');
        mockJwt.verify.mockReturnValue(incompletePayload as any);

        authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token',
          message: 'The provided token is missing required claims.',
        });
      });
    });

    describe('requirePermission', () => {
      test('should allow access with required permission', async () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: {
            canManageBankAccounts: true,
            canEditPayments: true,
            canViewReports: true,
            canManageFamily: true,
          },
        };

        const mockUser = {
          id: 'user-123',
          permissions: {
            canManageBankAccounts: true,
            canEditPayments: true,
            canViewReports: true,
            canManageFamily: true,
          },
        };

        mockUserService.getUserById.mockResolvedValue(mockUser as any);

        const middleware = requirePermission('canEditPayments');
        await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockUserService.getUserById).toHaveBeenCalledWith('user-123');
      });

      test('should deny access without required permission', async () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'viewer',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: true,
            canManageFamily: false,
          },
        };

        const mockUser = {
          id: 'user-123',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: true,
            canManageFamily: false,
          },
        };

        mockUserService.getUserById.mockResolvedValue(mockUser as any);

        const middleware = requirePermission('canEditPayments');
        await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Insufficient permissions',
          message: 'You do not have permission to perform this action. Required: canEditPayments',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle user not found', async () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: false,
            canManageFamily: false,
          },
        };

        mockUserService.getUserById.mockResolvedValue(null);

        const middleware = requirePermission('canEditPayments');
        await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'User not found',
          message: 'The authenticated user was not found.',
        });
      });

      test('should handle database error during permission check', async () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: false,
            canManageFamily: false,
          },
        };

        mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

        const middleware = requirePermission('canEditPayments');
        await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Permission check failed',
          message: 'Failed to verify user permissions. Please try again.',
        });
      });
    });

    describe('requireRole', () => {
      test('should allow access with required role', () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: {
            canManageBankAccounts: true,
            canEditPayments: true,
            canViewReports: true,
            canManageFamily: true,
          },
        };

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should deny access with insufficient role', () => {
        mockRequest.user = {
          id: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'viewer',
          permissions: {
            canManageBankAccounts: false,
            canEditPayments: false,
            canViewReports: true,
            canManageFamily: false,
          },
        };

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Insufficient role',
          message: 'This action requires admin role. Your role: viewer',
        });
      });

      test('should handle unauthenticated request', () => {
        mockRequest.user = undefined;

        const middleware = requireRole('admin');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Not authenticated',
          message: 'Authentication is required for this endpoint.',
        });
      });
    });

    describe('optionalAuth', () => {
      test('should pass through without token', () => {
        (mockRequest.get as jest.Mock).mockReturnValue(undefined);

        optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRequest.user).toBeUndefined();
      });

      test('should authenticate when token is provided', () => {
        const mockPayload: JWTPayload = {
          userId: 'user-123',
          familyId: 'family-123',
          email: 'test@example.com',
          role: 'admin',
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        (mockRequest.get as jest.Mock).mockReturnValue('Bearer valid-token');
        mockJwt.verify.mockReturnValue(mockPayload as any);

        optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRequest.user).toBeDefined();
      });
    });
  });

  describe('Validation Middleware', () => {
    describe('validateRequest', () => {
      test('should validate request body successfully', () => {
        mockRequest.body = {
          email: 'test@example.com',
          name: 'John Doe',
        };

        const schema = {
          body: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string', minLength: 1 },
            },
            required: ['email', 'name'],
            additionalProperties: false,
          },
        };

        const middleware = validateRequest(schema);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should reject invalid request body', () => {
        mockRequest.body = {
          email: 'invalid-email',
          name: '',
        };

        const schema = {
          body: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string', minLength: 1 },
            },
            required: ['email', 'name'],
            additionalProperties: false,
          },
        };

        const middleware = validateRequest(schema);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Validation failed',
          message: 'Request validation failed. Please check the provided data.',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.stringContaining('email'),
              message: expect.any(String),
            }),
          ]),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should validate query parameters', () => {
        mockRequest.query = {
          page: '1',
          limit: '10',
        };

        const schema = {
          query: {
            type: 'object',
            properties: {
              page: { type: 'string', pattern: '^[1-9][0-9]*$' },
              limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
            },
            additionalProperties: false,
          },
        };

        const middleware = validateRequest(schema);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should validate path parameters', () => {
        mockRequest.params = {
          id: '123e4567-e89b-12d3-a456-426614174000',
        };

        const schema = {
          params: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
            },
            required: ['id'],
            additionalProperties: true,
          },
        };

        const middleware = validateRequest(schema);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should handle validation error gracefully', () => {
        mockRequest.body = { test: 'data' };

        // Create an invalid schema to trigger internal error
        const invalidSchema = {
          body: null, // This will cause AJV to throw
        };

        const middleware = validateRequest(invalidSchema as any);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Validation error',
          message: 'An error occurred while validating the request.',
        });
      });
    });

    describe('validateUuidParam', () => {
      test('should validate valid UUID parameter', () => {
        mockRequest.params = {
          id: '123e4567-e89b-12d3-a456-426614174000',
        };

        const middleware = validateUuidParam('id');
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should reject invalid UUID parameter', () => {
        mockRequest.params = {
          id: 'invalid-uuid',
        };

        const middleware = validateUuidParam('id');
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('sanitizeInput', () => {
      test('should sanitize string inputs', () => {
        mockRequest.body = {
          name: '  John Doe  ',
          description: '  Test description  ',
        };

        mockRequest.query = {
          search: '  search term  ',
        };

        sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.body.name).toBe('John Doe');
        expect(mockRequest.body.description).toBe('Test description');
        expect(mockRequest.query.search).toBe('search term');
        expect(mockNext).toHaveBeenCalled();
      });

      test('should sanitize nested objects and arrays', () => {
        mockRequest.body = {
          user: {
            name: '  John  ',
            tags: ['  tag1  ', '  tag2  '],
          },
          items: [
            { title: '  Item 1  ' },
            { title: '  Item 2  ' },
          ],
        };

        sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockRequest.body.user.name).toBe('John');
        expect(mockRequest.body.user.tags).toEqual(['tag1', 'tag2']);
        expect(mockRequest.body.items[0].title).toBe('Item 1');
        expect(mockNext).toHaveBeenCalled();
      });

      test('should handle sanitization error gracefully', () => {
        // Create circular reference to cause error
        const circular: any = { name: 'test' };
        circular.self = circular;
        mockRequest.body = circular;

        sanitizeInput(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Input sanitization failed',
          message: 'An error occurred while processing the request.',
        });
      });
    });

    describe('Common Schemas', () => {
      test('should provide valid UUID schema', () => {
        expect(commonSchemas.uuid).toEqual({
          type: 'string',
          format: 'uuid',
        });
      });

      test('should provide valid email schema', () => {
        expect(commonSchemas.email).toEqual({
          type: 'string',
          format: 'email',
          maxLength: 255,
        });
      });

      test('should provide valid password schema', () => {
        expect(commonSchemas.password).toEqual({
          type: 'string',
          minLength: 12,
          maxLength: 128,
        });
      });
    });
  });

  describe('Error Handler Middleware', () => {
    describe('errorHandler', () => {
      test('should handle AppError correctly', () => {
        const error = new AppError('Custom error', 400, { field: 'email' });
        (mockRequest.get as jest.Mock).mockReturnValue('req-123');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Client Error',
          message: 'Custom error',
          details: { field: 'email' },
          timestamp: expect.any(String),
          requestId: 'req-123',
        });
      });

      test('should handle Prisma unique constraint violation', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
          'Unique constraint violation',
          {
            code: 'P2002',
            clientVersion: '4.0.0',
            meta: { target: ['email'] },
          }
        );

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Client Error',
          message: 'A record with this data already exists',
          details: { constraint: ['email'] },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });
      });

      test('should handle Prisma record not found', () => {
        const error = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          {
            code: 'P2025',
            clientVersion: '4.0.0',
          }
        );

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Client Error',
          message: 'The requested record was not found',
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });
      });

      test('should handle JSON parsing error', () => {
        const error = new SyntaxError('Unexpected token in JSON');
        (error as any).body = true;

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Client Error',
          message: 'Invalid JSON in request body',
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });
      });

      test('should handle unexpected error in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const error = new Error('Internal server error');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Server Error',
          message: 'An unexpected error occurred',
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });

        process.env.NODE_ENV = originalEnv;
      });

      test('should handle unexpected error in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error = new Error('Internal server error');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Server Error',
          message: 'Internal server error',
          details: { stack: expect.any(String) },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });

        process.env.NODE_ENV = originalEnv;
      });

      test('should handle error in error handler', () => {
        const error = new Error('Test error');

        // Mock response.status to throw error
        (mockResponse.status as jest.Mock).mockImplementation(() => {
          throw new Error('Response error');
        });

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        // Should call res.status(500).json() as fallback
        expect(mockResponse.status).toHaveBeenCalled();
      });
    });

    describe('notFoundHandler', () => {
      test('should create 404 error for unknown route', () => {
        mockRequest.method = 'GET';
        mockRequest.originalUrl = '/api/unknown';

        notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            message: 'Route GET /api/unknown not found',
          })
        );
      });
    });

    describe('asyncHandler', () => {
      test('should handle successful async function', async () => {
        const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
          res.json({ success: true });
        };

        const wrappedFn = asyncHandler(asyncFn);
        await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle async function error', async () => {
        const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
          throw new Error('Async error');
        };

        const wrappedFn = asyncHandler(asyncFn);
        await wrappedFn(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Async error',
        }));
      });
    });

    describe('throwError helpers', () => {
      test('should throw bad request error', () => {
        expect(() => throwError.badRequest('Invalid input')).toThrow(AppError);
        expect(() => throwError.badRequest('Invalid input')).toThrow('Invalid input');
      });

      test('should throw unauthorized error', () => {
        expect(() => throwError.unauthorized()).toThrow(AppError);
        expect(() => throwError.unauthorized('Custom message')).toThrow('Custom message');
      });

      test('should throw forbidden error', () => {
        expect(() => throwError.forbidden()).toThrow(AppError);
      });

      test('should throw not found error', () => {
        expect(() => throwError.notFound()).toThrow(AppError);
      });

      test('should throw conflict error', () => {
        expect(() => throwError.conflict('Conflict', { id: '123' })).toThrow(AppError);
      });

      test('should throw rate limit error', () => {
        expect(() => throwError.tooManyRequests()).toThrow(AppError);
      });
    });
  });

  describe('Rate Limit Middleware', () => {
    describe('rateLimit', () => {
      test('should allow request within rate limit', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
        };

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.set).toHaveBeenCalledWith({
          'RateLimit-Limit': '10',
          'RateLimit-Remaining': '9',
          'RateLimit-Reset': expect.any(String),
        });
      });

      test('should reject request exceeding rate limit', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 1,
        };

        const middleware = rateLimit(options);

        // First request should pass
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Reset mocks for second request
        jest.clearAllMocks();

        // Second request should be rate limited
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later.',
          retryAfter: 60,
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should use custom key generator', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
          keyGenerator: (req) => `user:${(req as any).user?.id || 'anonymous'}`,
        };

        mockRequest.user = { id: 'user-123' } as any;

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should use dynamic max function', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: (req) => {
            const user = (req as any).user;
            return user?.tier === 'premium' ? 100 : 10;
          },
        };

        mockRequest.user = { tier: 'premium' } as any;

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.set).toHaveBeenCalledWith({
          'RateLimit-Limit': '100',
          'RateLimit-Remaining': '99',
          'RateLimit-Reset': expect.any(String),
        });
      });

      test('should handle rate limit middleware error gracefully', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
        };

        // Mock IP to be undefined to potentially cause error
        mockRequest.ip = undefined;

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Should still call next even if there's an error
        expect(mockNext).toHaveBeenCalled();
      });

      test('should set legacy headers when enabled', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
          legacyHeaders: true,
        };

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockResponse.set).toHaveBeenCalledWith({
          'RateLimit-Limit': '10',
          'RateLimit-Remaining': '9',
          'RateLimit-Reset': expect.any(String),
        });

        expect(mockResponse.set).toHaveBeenCalledWith({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': expect.any(String),
        });
      });

      test('should skip successful requests when configured', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
          skipSuccessfulRequests: true,
        };

        // Mock successful response
        mockResponse.statusCode = 200;

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      test('should skip failed requests when configured', async () => {
        const options: RateLimitOptions = {
          windowMs: 60000,
          max: 10,
          skipFailedRequests: true,
        };

        // Mock failed response
        mockResponse.statusCode = 400;

        const middleware = rateLimit(options);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('rateLimitPresets', () => {
      test('should provide general rate limit preset', () => {
        // Mock the config functions to avoid actual imports
        const mockGetRateLimitConfig = jest.fn().mockReturnValue({
          windowMs: 60000,
          max: 100,
        });
        const mockGetCurrentEnvironment = jest.fn().mockReturnValue('development');

        // Mock the module
        jest.mock('../../backend/src/config/rate-limits', () => ({
          getRateLimitConfig: mockGetRateLimitConfig,
          getCurrentEnvironment: mockGetCurrentEnvironment,
        }));

        expect(rateLimitPresets.general).toBeDefined();
        expect(typeof rateLimitPresets.general).toBe('function');
      });

      test('should provide auth rate limit preset', () => {
        expect(rateLimitPresets.auth).toBeDefined();
        expect(typeof rateLimitPresets.auth).toBe('function');
      });

      test('should provide all required presets', () => {
        const requiredPresets = [
          'general', 'auth', 'passwordReset', 'bankSync',
          'fileUpload', 'reportExport', 'docs', 'health', 'api'
        ];

        for (const preset of requiredPresets) {
          expect(rateLimitPresets).toHaveProperty(preset);
          expect(typeof rateLimitPresets[preset as keyof typeof rateLimitPresets]).toBe('function');
        }
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work with authentication and validation together', async () => {
      // Setup authenticated request
      const mockPayload: JWTPayload = {
        userId: 'user-123',
        familyId: 'family-123',
        email: 'test@example.com',
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      (mockRequest.get as jest.Mock).mockReturnValue('Bearer valid-token');
      mockJwt.verify.mockReturnValue(mockPayload as any);

      // First apply authentication
      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();

      // Reset next mock
      mockNext.mockClear();

      // Then apply validation
      mockRequest.body = { email: 'test@example.com' };
      const schema = {
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
          required: ['email'],
        },
      };

      const validationMiddleware = validateRequest(schema);
      validationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle middleware chain with error', () => {
      // Simulate error in middleware chain
      const error = new AppError('Test error', 400);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Client Error',
        message: 'Test error',
        timestamp: expect.any(String),
        requestId: expect.any(String),
      });
    });
  });
});