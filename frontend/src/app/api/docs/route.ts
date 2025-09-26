import { NextResponse } from 'next/server';

export interface ApiDocumentation {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact: {
      name: string;
      email: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
}

function generateApiDocumentation(): ApiDocumentation {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    openapi: '3.0.0',
    info: {
      title: 'KGiQ Family Finance API',
      description: 'Comprehensive family financial management API with income tracking, payment management, budgeting, and bank account integration.',
      version: process.env.npm_package_version || '1.0.0',
      contact: {
        name: 'KGiQ Support',
        email: 'support@kgiq.com',
      },
    },
    servers: [
      {
        url: `${baseUrl}/api`,
        description: 'Production API',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development API',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health Check',
          description: 'Check the health status of the API and its dependencies',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Service is unhealthy',
            },
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'User Registration',
          description: 'Register a new user and create their family',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid request data',
            },
            '409': {
              description: 'Email already exists',
            },
          },
        },
      },
      '/auth/verify-email': {
        post: {
          summary: 'Email Verification',
          description: 'Verify user email address with token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Email verified successfully',
            },
            '400': {
              description: 'Invalid or expired token',
            },
          },
        },
      },
      '/families': {
        get: {
          summary: 'Get Family Information',
          description: 'Retrieve family settings and member information',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Family information retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/FamilyResponse' },
                },
              },
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
        patch: {
          summary: 'Update Family Settings',
          description: 'Update family name and settings',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateFamilyRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Family updated successfully',
            },
            '401': {
              description: 'Not authenticated',
            },
            '403': {
              description: 'Insufficient permissions',
            },
          },
        },
      },
      '/income-events': {
        get: {
          summary: 'Get Income Events',
          description: 'Retrieve family income events with filtering',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50 },
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 },
            },
            {
              name: 'startDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
            {
              name: 'endDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
          ],
          responses: {
            '200': {
              description: 'Income events retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/IncomeEventsResponse' },
                },
              },
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
        post: {
          summary: 'Create Income Event',
          description: 'Create a new income event',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateIncomeEventRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Income event created successfully',
            },
            '400': {
              description: 'Invalid request data',
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
      },
      '/payments': {
        get: {
          summary: 'Get Payments',
          description: 'Retrieve family payments with filtering',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Payments retrieved',
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
        post: {
          summary: 'Create Payment',
          description: 'Create a new payment',
          security: [{ bearerAuth: [] }],
          responses: {
            '201': {
              description: 'Payment created successfully',
            },
            '400': {
              description: 'Invalid request data',
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
      },
      '/bank-accounts': {
        get: {
          summary: 'Get Bank Accounts',
          description: 'Retrieve family bank accounts',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Bank accounts retrieved',
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
      },
      '/transactions/match-payments': {
        post: {
          summary: 'Match Transactions to Payments',
          description: 'Automatically match bank transactions to scheduled payments',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MatchPaymentsRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Transaction matching completed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MatchPaymentsResponse' },
                },
              },
            },
            '401': {
              description: 'Not authenticated',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
            },
            environment: {
              type: 'string',
            },
            uptime: {
              type: 'number',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'familyName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              minLength: 12,
            },
            firstName: {
              type: 'string',
              maxLength: 50,
            },
            lastName: {
              type: 'string',
              maxLength: 50,
            },
            familyName: {
              type: 'string',
              maxLength: 100,
            },
            timezone: {
              type: 'string',
            },
            currency: {
              type: 'string',
              pattern: '^[A-Z]{3}$',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
              },
            },
            family: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                name: {
                  type: 'string',
                },
              },
            },
            token: {
              type: 'string',
            },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
            },
          },
        },
        FamilyResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            settings: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                },
                currency: {
                  type: 'string',
                },
                fiscalYearStart: {
                  type: 'number',
                },
              },
            },
          },
        },
        UpdateFamilyRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 100,
            },
            settings: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                },
                currency: {
                  type: 'string',
                  pattern: '^[A-Z]{3}$',
                },
                fiscalYearStart: {
                  type: 'number',
                  minimum: 1,
                  maximum: 12,
                },
              },
            },
          },
        },
        IncomeEventsResponse: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                  },
                  amount: {
                    type: 'number',
                  },
                  receivedDate: {
                    type: 'string',
                    format: 'date',
                  },
                  description: {
                    type: 'string',
                  },
                },
              },
            },
            total: {
              type: 'number',
            },
            summary: {
              type: 'object',
              properties: {
                totalAmount: {
                  type: 'number',
                },
                count: {
                  type: 'number',
                },
              },
            },
          },
        },
        CreateIncomeEventRequest: {
          type: 'object',
          required: ['sourceId', 'amount', 'receivedDate'],
          properties: {
            sourceId: {
              type: 'string',
              format: 'uuid',
            },
            amount: {
              type: 'number',
              minimum: 0.01,
            },
            receivedDate: {
              type: 'string',
              format: 'date',
            },
            description: {
              type: 'string',
              maxLength: 500,
            },
          },
        },
        MatchPaymentsRequest: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              format: 'date',
            },
            toDate: {
              type: 'string',
              format: 'date',
            },
            accountIds: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
            },
          },
        },
        MatchPaymentsResponse: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  transactionId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  paymentId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  matchType: {
                    type: 'string',
                    enum: ['exact_amount', 'close_amount', 'merchant_match', 'date_range'],
                  },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalTransactions: {
                  type: 'number',
                },
                totalMatches: {
                  type: 'number',
                },
                highConfidenceMatches: {
                  type: 'number',
                },
              },
            },
          },
        },
      },
    },
  };
}

export async function GET() {
  try {
    const documentation = generateApiDocumentation();

    return NextResponse.json(documentation, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('API documentation generation error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to generate API documentation',
      },
      { status: 500 }
    );
  }
}