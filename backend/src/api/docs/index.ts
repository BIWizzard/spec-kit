import { Request, Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';

export interface ApiDocsResponse {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: EndpointGroup[];
  authentication: {
    type: string;
    description: string;
  };
}

export interface EndpointGroup {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  authentication: boolean;
  parameters?: Parameter[];
  responses: Response[];
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ResponseDoc {
  status: number;
  description: string;
  example?: any;
}

export async function getApiDocumentation(req: Request, res: Response) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const documentation: ApiDocsResponse = {
      title: 'Family Finance API',
      version: '1.0.0',
      description: 'API for managing family finances, income attribution, and expense tracking',
      baseUrl,
      authentication: {
        type: 'Bearer Token',
        description: 'JWT tokens obtained from /api/auth/login',
      },
      endpoints: [
        {
          name: 'Authentication',
          description: 'User authentication and session management',
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/register',
              description: 'Register a new family account',
              authentication: false,
              responses: [
                { status: 201, description: 'Account created successfully' },
                { status: 400, description: 'Validation errors' },
              ],
            },
            {
              method: 'POST',
              path: '/api/auth/login',
              description: 'Authenticate user and get access token',
              authentication: false,
              responses: [
                { status: 200, description: 'Login successful' },
                { status: 401, description: 'Invalid credentials' },
              ],
            },
            {
              method: 'POST',
              path: '/api/auth/logout',
              description: 'Logout user and invalidate session',
              authentication: true,
              responses: [
                { status: 200, description: 'Logout successful' },
              ],
            },
            {
              method: 'GET',
              path: '/api/auth/me',
              description: 'Get current user profile',
              authentication: true,
              responses: [
                { status: 200, description: 'User profile data' },
                { status: 401, description: 'Not authenticated' },
              ],
            },
          ],
        },
        {
          name: 'Family Management',
          description: 'Family settings and member management',
          endpoints: [
            {
              method: 'GET',
              path: '/api/families',
              description: 'Get family information',
              authentication: true,
              responses: [
                { status: 200, description: 'Family information' },
                { status: 404, description: 'Family not found' },
              ],
            },
            {
              method: 'PUT',
              path: '/api/families',
              description: 'Update family settings',
              authentication: true,
              responses: [
                { status: 200, description: 'Family updated successfully' },
                { status: 403, description: 'Insufficient permissions' },
              ],
            },
          ],
        },
        {
          name: 'Income Management',
          description: 'Income event scheduling and attribution',
          endpoints: [
            {
              method: 'GET',
              path: '/api/income-events',
              description: 'List income events',
              authentication: true,
              responses: [
                { status: 200, description: 'Income events list' },
              ],
            },
            {
              method: 'POST',
              path: '/api/income-events',
              description: 'Create new income event',
              authentication: true,
              responses: [
                { status: 201, description: 'Income event created' },
                { status: 400, description: 'Validation errors' },
              ],
            },
          ],
        },
        {
          name: 'Payment Management',
          description: 'Payment scheduling and attribution',
          endpoints: [
            {
              method: 'GET',
              path: '/api/payments',
              description: 'List payments',
              authentication: true,
              responses: [
                { status: 200, description: 'Payments list' },
              ],
            },
            {
              method: 'POST',
              path: '/api/payments',
              description: 'Create new payment',
              authentication: true,
              responses: [
                { status: 201, description: 'Payment created' },
                { status: 400, description: 'Validation errors' },
              ],
            },
          ],
        },
        {
          name: 'Bank Integration',
          description: 'Bank account connection and transaction management',
          endpoints: [
            {
              method: 'GET',
              path: '/api/bank-accounts',
              description: 'List connected bank accounts',
              authentication: true,
              responses: [
                { status: 200, description: 'Bank accounts list' },
              ],
            },
            {
              method: 'POST',
              path: '/api/bank-accounts',
              description: 'Connect bank account via Plaid',
              authentication: true,
              responses: [
                { status: 201, description: 'Bank account connected' },
                { status: 400, description: 'Connection failed' },
              ],
            },
          ],
        },
        {
          name: 'Budget Management',
          description: 'Budget categories and allocation management',
          endpoints: [
            {
              method: 'GET',
              path: '/api/budget-categories',
              description: 'List budget categories',
              authentication: true,
              responses: [
                { status: 200, description: 'Budget categories list' },
              ],
            },
            {
              method: 'GET',
              path: '/api/budget/overview',
              description: 'Get budget overview and allocations',
              authentication: true,
              responses: [
                { status: 200, description: 'Budget overview data' },
              ],
            },
          ],
        },
        {
          name: 'Reports & Analytics',
          description: 'Financial reports and analytics',
          endpoints: [
            {
              method: 'GET',
              path: '/api/reports/cash-flow',
              description: 'Generate cash flow report',
              authentication: true,
              responses: [
                { status: 200, description: 'Cash flow report data' },
              ],
            },
            {
              method: 'GET',
              path: '/api/analytics/dashboard',
              description: 'Get analytics dashboard data',
              authentication: true,
              responses: [
                { status: 200, description: 'Dashboard analytics' },
              ],
            },
          ],
        },
        {
          name: 'Infrastructure',
          description: 'System health and configuration',
          endpoints: [
            {
              method: 'GET',
              path: '/api/health',
              description: 'System health check',
              authentication: false,
              responses: [
                { status: 200, description: 'System is healthy' },
                { status: 503, description: 'System is unhealthy' },
              ],
            },
            {
              method: 'GET',
              path: '/api/env',
              description: 'Environment information',
              authentication: false,
              responses: [
                { status: 200, description: 'Environment details' },
              ],
            },
          ],
        },
      ],
    };

    res.status(200).json(documentation);
  } catch (error) {
    console.error('API documentation error:', error);

    res.status(500).json({
      error: 'Failed to get API documentation',
      message: 'Failed to generate API documentation. Please try again.',
    });
  }
}

export async function getOpenApiSpec(req: Request, res: Response) {
  try {
    // Try to load OpenAPI spec from file system
    try {
      const specPath = join(process.cwd(), 'docs', 'openapi.json');
      const spec = JSON.parse(readFileSync(specPath, 'utf8'));
      res.status(200).json(spec);
      return;
    } catch (fileError) {
      // Fall back to generated spec
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Family Finance API',
        version: '1.0.0',
        description: 'API for managing family finances, income attribution, and expense tracking',
      },
      servers: [
        {
          url: baseUrl,
          description: 'Current server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      paths: {
        '/api/health': {
          get: {
            summary: 'System health check',
            security: [],
            responses: {
              200: {
                description: 'System is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' },
                        uptime: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    res.status(200).json(openApiSpec);
  } catch (error) {
    console.error('OpenAPI spec error:', error);

    res.status(500).json({
      error: 'Failed to get OpenAPI specification',
      message: 'Failed to generate OpenAPI specification. Please try again.',
    });
  }
}