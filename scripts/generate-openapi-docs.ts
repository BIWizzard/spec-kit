#!/usr/bin/env ts-node

/**
 * OpenAPI Documentation Generator
 * Task: T459 - Generate OpenAPI documentation from contracts
 *
 * This script analyzes all contract tests and generates comprehensive
 * OpenAPI 3.0 documentation for the Family Finance Web Application API.
 */

import fs from 'fs/promises';
import path from 'path';

interface OpenAPIEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurity[];
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: OpenAPISchema;
  description?: string;
}

interface OpenAPIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, { schema: OpenAPISchema }>;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchema }>;
  headers?: Record<string, OpenAPIHeader>;
}

interface OpenAPIHeader {
  description: string;
  schema: OpenAPISchema;
}

interface OpenAPISchema {
  type?: string;
  $ref?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  format?: string;
  example?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
}

interface OpenAPISecurity {
  bearerAuth: string[];
}

interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  tags: OpenAPITag[];
  paths: Record<string, Record<string, OpenAPIEndpoint>>;
  components: OpenAPIComponents;
}

interface OpenAPIInfo {
  title: string;
  version: string;
  description: string;
  contact: {
    name: string;
    email: string;
    url: string;
  };
  license: {
    name: string;
    url: string;
  };
}

interface OpenAPIServer {
  url: string;
  description: string;
}

interface OpenAPITag {
  name: string;
  description: string;
}

interface OpenAPIComponents {
  securitySchemes: Record<string, OpenAPISecurityScheme>;
  schemas: Record<string, OpenAPISchema>;
}

interface OpenAPISecurityScheme {
  type: string;
  scheme: string;
  bearerFormat: string;
  description: string;
}

class OpenAPIGenerator {
  private endpoints: OpenAPIEndpoint[] = [];
  private schemas: Record<string, OpenAPISchema> = {};

  constructor() {
    this.initializeCommonSchemas();
  }

  private initializeCommonSchemas(): void {
    // User and Family schemas
    this.schemas.User = {
      type: 'object',
      required: ['id', 'email', 'firstName', 'lastName', 'familyId', 'role'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
        email: { type: 'string', format: 'email', description: 'User email address' },
        firstName: { type: 'string', description: 'User first name' },
        lastName: { type: 'string', description: 'User last name' },
        familyId: { type: 'string', format: 'uuid', description: 'Family identifier' },
        role: { type: 'string', enum: ['admin', 'member'], description: 'User role in family' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth (optional)' },
        timezone: { type: 'string', description: 'User timezone' },
        createdAt: { type: 'string', format: 'date-time', description: 'Account creation date' },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update date' }
      }
    };

    this.schemas.Family = {
      type: 'object',
      required: ['id', 'name', 'currency'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Family unique identifier' },
        name: { type: 'string', description: 'Family name' },
        currency: { type: 'string', description: 'Default currency (USD, EUR, etc.)' },
        timezone: { type: 'string', description: 'Family timezone' },
        settings: { type: 'object', description: 'Family-specific settings' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update date' }
      }
    };

    // Financial schemas
    this.schemas.BankAccount = {
      type: 'object',
      required: ['id', 'familyId', 'institutionName', 'accountType', 'isActive'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Bank account identifier' },
        familyId: { type: 'string', format: 'uuid', description: 'Family identifier' },
        plaidAccountId: { type: 'string', description: 'Plaid account identifier' },
        institutionName: { type: 'string', description: 'Bank institution name' },
        accountName: { type: 'string', description: 'Account display name' },
        accountType: { type: 'string', enum: ['checking', 'savings', 'credit'], description: 'Account type' },
        accountNumber: { type: 'string', description: 'Masked account number' },
        routingNumber: { type: 'string', description: 'Bank routing number' },
        balance: { type: 'number', format: 'decimal', description: 'Current balance' },
        availableBalance: { type: 'number', format: 'decimal', description: 'Available balance' },
        isActive: { type: 'boolean', description: 'Account active status' },
        lastSyncAt: { type: 'string', format: 'date-time', description: 'Last synchronization date' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    this.schemas.Transaction = {
      type: 'object',
      required: ['id', 'bankAccountId', 'plaidTransactionId', 'amount', 'date'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Transaction identifier' },
        bankAccountId: { type: 'string', format: 'uuid', description: 'Bank account identifier' },
        plaidTransactionId: { type: 'string', description: 'Plaid transaction ID' },
        amount: { type: 'number', format: 'decimal', description: 'Transaction amount' },
        description: { type: 'string', description: 'Transaction description' },
        date: { type: 'string', format: 'date', description: 'Transaction date' },
        category: { type: 'string', description: 'Transaction category' },
        spendingCategoryId: { type: 'string', format: 'uuid', description: 'Assigned spending category' },
        isPending: { type: 'boolean', description: 'Transaction pending status' },
        matchedPaymentId: { type: 'string', format: 'uuid', description: 'Matched payment ID' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    this.schemas.IncomeEvent = {
      type: 'object',
      required: ['id', 'familyId', 'name', 'amount', 'frequency', 'nextDate'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Income event identifier' },
        familyId: { type: 'string', format: 'uuid', description: 'Family identifier' },
        name: { type: 'string', description: 'Income event name' },
        amount: { type: 'number', format: 'decimal', description: 'Expected income amount' },
        frequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'], description: 'Income frequency' },
        nextDate: { type: 'string', format: 'date', description: 'Next expected date' },
        lastReceivedDate: { type: 'string', format: 'date', description: 'Last received date' },
        lastReceivedAmount: { type: 'number', format: 'decimal', description: 'Last received amount' },
        source: { type: 'string', description: 'Income source description' },
        isActive: { type: 'boolean', description: 'Income event active status' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    this.schemas.Payment = {
      type: 'object',
      required: ['id', 'familyId', 'name', 'amount', 'dueDate'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Payment identifier' },
        familyId: { type: 'string', format: 'uuid', description: 'Family identifier' },
        name: { type: 'string', description: 'Payment name' },
        amount: { type: 'number', format: 'decimal', description: 'Payment amount' },
        dueDate: { type: 'string', format: 'date', description: 'Payment due date' },
        isPaid: { type: 'boolean', description: 'Payment status' },
        paidDate: { type: 'string', format: 'date', description: 'Date payment was made' },
        paidAmount: { type: 'number', format: 'decimal', description: 'Actual amount paid' },
        frequency: { type: 'string', enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annually'], description: 'Payment frequency' },
        spendingCategoryId: { type: 'string', format: 'uuid', description: 'Spending category' },
        notes: { type: 'string', description: 'Payment notes' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    // Budget schemas
    this.schemas.BudgetCategory = {
      type: 'object',
      required: ['id', 'familyId', 'name', 'percentage'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Budget category identifier' },
        familyId: { type: 'string', format: 'uuid', description: 'Family identifier' },
        name: { type: 'string', description: 'Category name' },
        percentage: { type: 'number', format: 'decimal', minimum: 0, maximum: 100, description: 'Percentage of income' },
        description: { type: 'string', description: 'Category description' },
        isFixed: { type: 'boolean', description: 'Fixed or percentage-based' },
        sortOrder: { type: 'number', description: 'Display order' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    this.schemas.BudgetAllocation = {
      type: 'object',
      required: ['id', 'incomeEventId', 'budgetCategoryId', 'amount'],
      properties: {
        id: { type: 'string', format: 'uuid', description: 'Budget allocation identifier' },
        incomeEventId: { type: 'string', format: 'uuid', description: 'Income event identifier' },
        budgetCategoryId: { type: 'string', format: 'uuid', description: 'Budget category identifier' },
        amount: { type: 'number', format: 'decimal', description: 'Allocated amount' },
        percentage: { type: 'number', format: 'decimal', description: 'Allocation percentage' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation date' }
      }
    };

    // Authentication schemas
    this.schemas.AuthTokens = {
      type: 'object',
      required: ['accessToken', 'refreshToken', 'expiresIn'],
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        refreshToken: { type: 'string', description: 'JWT refresh token' },
        expiresIn: { type: 'number', description: 'Token expiration time in seconds' },
        tokenType: { type: 'string', example: 'Bearer', description: 'Token type' }
      }
    };

    // Request/Response schemas
    this.schemas.RegisterRequest = {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName', 'familyName'],
      properties: {
        email: { type: 'string', format: 'email', description: 'User email address' },
        password: { type: 'string', minLength: 8, description: 'User password (min 8 characters)' },
        firstName: { type: 'string', description: 'User first name' },
        lastName: { type: 'string', description: 'User last name' },
        familyName: { type: 'string', description: 'Family name' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        timezone: { type: 'string', description: 'User timezone' },
        currency: { type: 'string', description: 'Preferred currency' }
      }
    };

    this.schemas.LoginRequest = {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', description: 'User email address' },
        password: { type: 'string', description: 'User password' }
      }
    };

    this.schemas.ErrorResponse = {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: 'Error message' },
        error: { type: 'string', description: 'Error type' },
        statusCode: { type: 'number', description: 'HTTP status code' },
        timestamp: { type: 'string', format: 'date-time', description: 'Error timestamp' },
        path: { type: 'string', description: 'API endpoint path' }
      }
    };

    this.schemas.SuccessResponse = {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: 'Success message' },
        data: { type: 'object', description: 'Response data' }
      }
    };

    // Pagination schemas
    this.schemas.PaginationInfo = {
      type: 'object',
      required: ['page', 'pageSize', 'totalCount', 'totalPages'],
      properties: {
        page: { type: 'number', description: 'Current page number' },
        pageSize: { type: 'number', description: 'Items per page' },
        totalCount: { type: 'number', description: 'Total number of items' },
        totalPages: { type: 'number', description: 'Total number of pages' }
      }
    };
  }

  async generateDocumentation(): Promise<void> {
    console.log('🚀 Generating OpenAPI documentation from contract tests...');

    // Find all contract test files
    const contractFiles = await this.findContractFiles();
    console.log(`📁 Found ${contractFiles.length} contract test files`);
    console.log('First few files:', contractFiles.slice(0, 3));

    // Parse each contract file
    for (const file of contractFiles) {
      await this.parseContractFile(file);
    }

    // Generate OpenAPI specification
    const openAPISpec = this.generateOpenAPISpec();

    // Write OpenAPI spec to files
    await this.writeOpenAPIFiles(openAPISpec);

    console.log('✅ OpenAPI documentation generation complete!');
    console.log(`📊 Generated documentation for ${this.endpoints.length} endpoints`);
  }

  private async findContractFiles(): Promise<string[]> {
    const contractDir = path.join(process.cwd(), 'tests', 'contract');
    const files = await fs.readdir(contractDir);
    return files
      .filter(file => file.startsWith('test_') && file.endsWith('.ts'))
      .map(file => path.join(contractDir, file));
  }

  private async parseContractFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const endpoint = this.extractEndpointInfo(filePath, content);

      if (endpoint) {
        this.endpoints.push(endpoint);
      }
    } catch (error) {
      console.warn(`⚠️  Could not parse ${filePath}: ${error}`);
    }
  }

  private extractEndpointInfo(filePath: string, content: string): OpenAPIEndpoint | null {
    // Extract endpoint info from filename and content
    const fileName = path.basename(filePath, '.ts');
    const parts = fileName.replace('test_', '').split('_');

    if (parts.length < 2) return null;

    // Determine HTTP method and path
    let method = 'GET';
    let pathSegments = parts;

    // Check for HTTP methods in content
    if (content.includes('.post(')) method = 'POST';
    else if (content.includes('.put(')) method = 'PUT';
    else if (content.includes('.delete(')) method = 'DELETE';
    else if (content.includes('.patch(')) method = 'PATCH';

    // Build API path
    let apiPath = '/api';

    // Map file naming conventions to API paths
    if (parts[0] === 'auth') {
      apiPath += '/auth';
      if (parts.length > 1) {
        if (parts[1] === 'mfa' && parts[2]) {
          apiPath += `/mfa/${parts[2]}`;
        } else if (parts[1] === 'sessions') {
          apiPath += '/sessions';
          if (parts[2] === 'delete' && parts[3] === 'specific') {
            apiPath += '/{id}';
          }
        } else if (parts[1] !== 'register' && parts[1] !== 'login' && parts[1] !== 'logout') {
          apiPath += `/${parts.slice(1).join('-')}`;
        } else {
          apiPath += `/${parts[1]}`;
        }
      }
    } else if (parts[0] === 'families' || parts[0] === 'family') {
      apiPath += '/families';
      if (parts.includes('members')) {
        const memberIndex = parts.indexOf('members');
        if (parts[memberIndex + 1] === 'invite') {
          apiPath += '/members';
        } else if (parts[memberIndex + 1]) {
          apiPath += '/members/{id}';
        } else {
          apiPath += '/members';
        }
      } else if (parts.includes('invitations')) {
        apiPath += '/invitations';
        if (parts.includes('details') || parts.includes('cancel') || parts.includes('accept') || parts.includes('resend')) {
          apiPath += '/{id}';
          if (parts.includes('accept')) apiPath += '/accept';
          if (parts.includes('resend')) apiPath += '/resend';
        }
      } else if (parts.includes('activity')) {
        apiPath += '/activity';
      }
    } else if (parts[0] === 'income') {
      apiPath += '/income-events';
      if (parts.includes('details') || parts.includes('update') || parts.includes('delete') ||
          parts.includes('mark') || parts.includes('revert') || parts.includes('attributions')) {
        apiPath += '/{id}';
        if (parts.includes('mark') && parts.includes('received')) apiPath += '/mark-received';
        if (parts.includes('revert') && parts.includes('received')) apiPath += '/revert-received';
        if (parts.includes('attributions')) apiPath += '/attributions';
      } else if (parts.includes('upcoming')) {
        apiPath += '/upcoming';
      } else if (parts.includes('summary')) {
        apiPath += '/summary';
      } else if (parts.includes('bulk')) {
        apiPath += '/bulk';
      }
    } else if (parts[0] === 'payments') {
      apiPath += '/payments';
      if (parts.includes('details') || parts.includes('update') || parts.includes('delete') ||
          parts.includes('mark') || parts.includes('revert') || parts.includes('auto')) {
        apiPath += '/{id}';
        if (parts.includes('mark') && parts.includes('paid')) apiPath += '/mark-paid';
        if (parts.includes('revert') && parts.includes('paid')) apiPath += '/revert-paid';
        if (parts.includes('auto') && parts.includes('attribute')) apiPath += '/auto-attribute';
        if (parts.includes('attributions')) {
          apiPath += '/attributions';
          if (parts.length > 4) apiPath += '/{attributionId}';
        }
      } else if (parts.includes('upcoming')) {
        apiPath += '/upcoming';
      } else if (parts.includes('overdue')) {
        apiPath += '/overdue';
      } else if (parts.includes('summary')) {
        apiPath += '/summary';
      } else if (parts.includes('bulk')) {
        apiPath += '/bulk';
      }
    } else if (parts[0] === 'bank') {
      if (parts[1] === 'accounts') {
        apiPath += '/bank-accounts';
        if (parts.includes('details') || parts.includes('update') || parts.includes('delete') ||
            parts.includes('sync') || parts.includes('reconnect')) {
          apiPath += '/{id}';
          if (parts.includes('sync')) apiPath += '/sync';
          if (parts.includes('reconnect')) apiPath += '/reconnect';
        } else if (parts.includes('connect')) {
          // /bank-accounts for POST (connect)
        } else if (parts.includes('sync') && parts.includes('all')) {
          apiPath += '/sync-all';
        }
      } else if (parts[1] === 'sync') {
        apiPath += '/bank-accounts/{id}/sync';
      } else if (parts[1] === 'reconnect') {
        apiPath += '/bank-accounts/{id}/reconnect';
      }
    } else if (parts[0] === 'transactions') {
      apiPath += '/transactions';
      if (parts.includes('details') || parts.includes('update')) {
        apiPath += '/{id}';
      } else if (parts.includes('categorize') && parts.includes('batch')) {
        apiPath += '/categorize-batch';
      } else if (parts.includes('uncategorized')) {
        apiPath += '/uncategorized';
      } else if (parts.includes('match') && parts.includes('payments')) {
        apiPath += '/match-payments';
      }
    } else if (parts[0] === 'spending') {
      apiPath += '/spending-categories';
      if (parts.includes('update') || parts.includes('delete')) {
        apiPath += '/{id}';
      }
    } else if (parts[0] === 'budget') {
      if (parts[1] === 'categories') {
        apiPath += '/budget-categories';
        if (parts.includes('details') || parts.includes('update') || parts.includes('delete')) {
          apiPath += '/{id}';
        } else if (parts.includes('validate') && parts.includes('percentages')) {
          apiPath += '/validate-percentages';
        }
      } else if (parts[1] === 'allocations') {
        apiPath += '/budget-allocations';
        if (parts.includes('details') || parts.includes('update')) {
          apiPath += '/{id}';
        } else if (parts.includes('generate')) {
          apiPath += '/{incomeEventId}/generate';
        } else if (parts.includes('summary')) {
          apiPath += '/{incomeEventId}/summary';
        }
      } else if (parts[1] === 'overview') {
        apiPath += '/budget/overview';
      } else if (parts[1] === 'performance') {
        apiPath += '/budget/performance';
      } else if (parts[1] === 'projections') {
        apiPath += '/budget/projections';
      } else if (parts[1] === 'templates') {
        apiPath += '/budget/templates';
        if (parts.includes('apply')) {
          // POST for apply
        }
      }
    } else if (parts[0] === 'reports') {
      apiPath += '/reports';
      if (parts[1] === 'cash' && parts[2] === 'flow') {
        apiPath += '/cash-flow';
      } else if (parts[1] === 'spending') {
        apiPath += '/spending-analysis';
      } else if (parts[1] === 'budget' && parts[2] === 'performance') {
        apiPath += '/budget-performance';
      } else if (parts[1] === 'income' && parts[2] === 'analysis') {
        apiPath += '/income-analysis';
      } else if (parts[1] === 'net' && parts[2] === 'worth') {
        apiPath += '/net-worth';
      } else if (parts[1] === 'savings' && parts[2] === 'rate') {
        apiPath += '/savings-rate';
      } else if (parts[1] === 'debt' && parts[2] === 'analysis') {
        apiPath += '/debt-analysis';
      } else if (parts[1] === 'monthly' && parts[2] === 'summary') {
        apiPath += '/monthly-summary';
      } else if (parts[1] === 'annual' && parts[2] === 'summary') {
        apiPath += '/annual-summary';
      } else if (parts[1] === 'custom') {
        apiPath += '/custom';
      } else if (parts[1] === 'export') {
        apiPath += '/export';
      } else if (parts[1] === 'scheduled') {
        apiPath += '/scheduled';
        if (parts.includes('details') || parts.includes('update') || parts.includes('delete')) {
          apiPath += '/{id}';
        }
      }
    } else if (parts[0] === 'analytics') {
      apiPath += '/analytics';
      if (parts[1] === 'dashboard') {
        apiPath += '/dashboard';
      } else if (parts[1] === 'trends') {
        apiPath += '/trends';
      } else if (parts[1] === 'insights') {
        apiPath += '/insights';
      }
    } else if (parts[0] === 'plaid') {
      apiPath += '/plaid';
      if (parts[1] === 'link' && parts[2] === 'token') {
        apiPath += '/link-token';
      } else if (parts[1] === 'webhook') {
        apiPath += '/webhook';
      }
    }

    // Determine tags and summary
    const tags = this.getEndpointTags(parts[0]);
    const summary = this.getEndpointSummary(method, apiPath);
    const description = this.getEndpointDescription(method, apiPath, content);

    // Determine if endpoint requires authentication
    const requiresAuth = !apiPath.includes('/auth/register') &&
                        !apiPath.includes('/auth/login') &&
                        !apiPath.includes('/plaid/webhook');

    return {
      path: apiPath,
      method: method.toLowerCase(),
      operationId: this.generateOperationId(method, apiPath),
      summary,
      description,
      tags,
      parameters: this.extractParameters(apiPath),
      requestBody: this.extractRequestBody(method, content),
      responses: this.extractResponses(content),
      security: requiresAuth ? [{ bearerAuth: [] }] : undefined
    };
  }

  private getEndpointTags(category: string): string[] {
    const tagMapping: Record<string, string[]> = {
      'auth': ['Authentication'],
      'families': ['Family Management'],
      'family': ['Family Management'],
      'income': ['Income Management'],
      'payments': ['Payment Management'],
      'bank': ['Bank Integration'],
      'transactions': ['Transactions'],
      'spending': ['Payment Management'],
      'budget': ['Budget Management'],
      'reports': ['Reports & Analytics'],
      'analytics': ['Reports & Analytics'],
      'plaid': ['Bank Integration']
    };
    return tagMapping[category] || ['General'];
  }

  private getEndpointSummary(method: string, path: string): string {
    const pathParts = path.split('/').filter(p => p && !p.startsWith('{'));
    const resource = pathParts[pathParts.length - 1];

    const methodSummaries: Record<string, string> = {
      'GET': `Get ${resource}`,
      'POST': `Create ${resource}`,
      'PUT': `Update ${resource}`,
      'DELETE': `Delete ${resource}`,
      'PATCH': `Modify ${resource}`
    };

    return methodSummaries[method] || `${method} ${resource}`;
  }

  private getEndpointDescription(method: string, path: string, content: string): string {
    // Extract description from contract test comments
    const descMatch = content.match(/\* Task: T\d+ - (.+)/);
    if (descMatch) {
      return descMatch[1].replace(' contract validation', '').replace(' endpoint', '');
    }

    return `${method} endpoint for ${path}`;
  }

  private generateOperationId(method: string, path: string): string {
    const parts = path.split('/').filter(p => p && p !== 'api');
    const cleanParts = parts.map(p =>
      p.startsWith('{') ? p.replace(/[{}]/g, 'By') :
      p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
    );
    return method.toLowerCase() + cleanParts.join('');
  }

  private extractParameters(path: string): OpenAPIParameter[] {
    const params: OpenAPIParameter[] = [];
    const pathParams = path.match(/{([^}]+)}/g);

    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.replace(/[{}]/g, '');
        params.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: `${paramName.charAt(0).toUpperCase() + paramName.slice(1)} identifier`
        });
      });
    }

    // Add common query parameters
    if (path.includes('/list') || path.endsWith('s')) {
      params.push(
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, example: 1 },
          description: 'Page number for pagination'
        },
        {
          name: 'pageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
          description: 'Number of items per page'
        }
      );
    }

    return params;
  }

  private extractRequestBody(method: string, content: string): OpenAPIRequestBody | undefined {
    if (method === 'GET' || method === 'DELETE') return undefined;

    // Map endpoints to request body schemas
    const requestBodyMapping: Record<string, string> = {
      '/api/auth/register': 'RegisterRequest',
      '/api/auth/login': 'LoginRequest'
    };

    let schemaRef = 'object';

    // Try to determine schema from content or path
    Object.entries(requestBodyMapping).forEach(([path, schema]) => {
      if (content.includes(path)) {
        schemaRef = schema;
      }
    });

    return {
      description: `Request body for ${method} operation`,
      required: true,
      content: {
        'application/json': {
          schema: schemaRef === 'object'
            ? { type: 'object' }
            : { $ref: `#/components/schemas/${schemaRef}` }
        }
      }
    };
  }

  private extractResponses(content: string): Record<string, OpenAPIResponse> {
    const responses: Record<string, OpenAPIResponse> = {};

    // Default success responses
    if (content.includes('.expect(200)') || content.includes('200')) {
      responses['200'] = {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      };
    }

    if (content.includes('.expect(201)') || content.includes('201')) {
      responses['201'] = {
        description: 'Resource created successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' }
          }
        }
      };
    }

    // Error responses
    responses['400'] = {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    };

    responses['401'] = {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    };

    responses['500'] = {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    };

    return responses;
  }

  private generateOpenAPISpec(): OpenAPISpec {
    const paths: Record<string, Record<string, any>> = {};

    // Group endpoints by path
    this.endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      paths[endpoint.path][endpoint.method] = endpoint;
    });

    return {
      openapi: '3.0.3',
      info: {
        title: 'Family Finance Web Application API',
        version: '1.0.0',
        description: `
          Comprehensive API for the KGiQ Family Finance Web Application.

          This API provides endpoints for family financial management including:
          - User authentication and session management
          - Family member and invitation management
          - Income event tracking and scheduling
          - Payment management and attribution
          - Bank account integration via Plaid
          - Transaction categorization and analysis
          - Budget creation and allocation
          - Financial reports and analytics

          ## Authentication
          Most endpoints require Bearer token authentication. Use the /auth/login endpoint to obtain tokens.

          ## Rate Limiting
          API requests are rate limited to prevent abuse. See response headers for current limits.

          ## Pagination
          List endpoints support pagination with 'page' and 'pageSize' query parameters.
        `,
        contact: {
          name: 'KGiQ Development Team',
          email: 'dev@kgiq.com',
          url: 'https://kgiq.com'
        },
        license: {
          name: 'Private License',
          url: 'https://kgiq.com/license'
        }
      },
      servers: [
        {
          url: 'https://family-finance.kgiq.com',
          description: 'Production server'
        },
        {
          url: 'https://staging-family-finance.kgiq.com',
          description: 'Staging server'
        },
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and session management' },
        { name: 'Family Management', description: 'Family and member management operations' },
        { name: 'Income Management', description: 'Income event tracking and scheduling' },
        { name: 'Payment Management', description: 'Payment management and attribution' },
        { name: 'Bank Integration', description: 'Bank account and transaction integration via Plaid' },
        { name: 'Transactions', description: 'Transaction categorization and analysis' },
        { name: 'Budget Management', description: 'Budget categories and allocations' },
        { name: 'Reports & Analytics', description: 'Financial reports and analytics' }
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token authentication'
          }
        },
        schemas: this.schemas
      }
    };
  }

  private async writeOpenAPIFiles(spec: OpenAPISpec): Promise<void> {
    // Ensure docs directory exists
    const docsDir = path.join(process.cwd(), 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    // Write JSON format
    const jsonPath = path.join(docsDir, 'openapi.json');
    await fs.writeFile(jsonPath, JSON.stringify(spec, null, 2));
    console.log(`📄 Generated ${jsonPath}`);

    // Write YAML format
    const yamlPath = path.join(docsDir, 'openapi.yaml');
    const yaml = this.jsonToYaml(spec);
    await fs.writeFile(yamlPath, yaml);
    console.log(`📄 Generated ${yamlPath}`);

    // Write HTML documentation
    const htmlPath = path.join(docsDir, 'api-docs.html');
    const html = this.generateHTMLDocs(spec);
    await fs.writeFile(htmlPath, html);
    console.log(`📄 Generated ${htmlPath}`);
  }

  private jsonToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        yaml += `${spaces}- ${this.jsonToYaml(item, indent + 1).trim()}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n`;
          yaml += this.jsonToYaml(value, indent + 1);
        } else {
          const stringValue = typeof value === 'string' && value.includes('\n')
            ? `|\n${value.split('\n').map(line => '  '.repeat(indent + 1) + line).join('\n')}\n`
            : JSON.stringify(value);
          yaml += `${spaces}${key}: ${stringValue}\n`;
        }
      });
    } else {
      yaml += obj;
    }

    return yaml;
  }

  private generateHTMLDocs(spec: OpenAPISpec): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spec.info.title} - API Documentation</title>
    <script src="https://unpkg.com/swagger-ui-bundle@4.19.1/swagger-ui-bundle.js"></script>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-bundle@4.19.1/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script>
        SwaggerUIBundle({
            url: './openapi.json',
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            layout: "StandaloneLayout",
            deepLinking: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true
        });
    </script>
</body>
</html>`;
  }
}

// Main execution
async function main() {
  try {
    const generator = new OpenAPIGenerator();
    await generator.generateDocumentation();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating OpenAPI documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { OpenAPIGenerator };