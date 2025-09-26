import { NextRequest, NextResponse } from 'next/server';
import { ValidationService } from '@/lib/services/validation.service';
import jwt from 'jsonwebtoken';

export interface SchemaValidationRequest {
  data: Record<string, any>;
  schema: 'registration' | 'login' | 'incomeEvent' | 'payment' | 'familyUpdate' | 'emailVerification';
  strict?: boolean;
}

export interface SchemaValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  schema: string;
  validatedAt: string;
}

function validateSchemaType(schema: string): boolean {
  const validSchemas = [
    'registration',
    'login',
    'incomeEvent',
    'payment',
    'familyUpdate',
    'emailVerification',
    'changePassword',
    'resetPassword',
    'inviteFamilyMember',
    'acceptInvitation',
  ];
  return validSchemas.includes(schema);
}

function validateRequestData(data: any): data is Record<string, any> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function performSchemaValidation(
  data: Record<string, any>,
  schema: string,
  strict: boolean = false
): { isValid: boolean; errors: string[]; warnings?: string[] } {
  let errors: string[] = [];
  let warnings: string[] = [];

  try {
    switch (schema) {
      case 'registration':
        errors = ValidationService.validateRegistration(data as any);
        break;

      case 'login':
        errors = ValidationService.validateLogin(data as any);
        break;

      case 'incomeEvent':
        errors = ValidationService.validateCreateIncomeEvent(data as any);
        break;

      case 'payment':
        const paymentValidation = ValidationService.validatePayment(data as any);
        errors = paymentValidation.isValid ? [] : paymentValidation.errors;
        warnings = paymentValidation.warnings || [];
        break;

      case 'familyUpdate':
        errors = ValidationService.validateFamilyUpdate(data as any);
        break;

      case 'emailVerification':
        errors = ValidationService.validateEmailVerification(data as any);
        break;

      case 'changePassword':
        errors = ValidationService.validateChangePassword(data as any);
        break;

      case 'resetPassword':
        errors = ValidationService.validateResetPassword(data as any);
        break;

      case 'inviteFamilyMember':
        errors = ValidationService.validateInviteFamilyMember(data as any);
        break;

      case 'acceptInvitation':
        errors = ValidationService.validateAcceptInvitation(data as any);
        break;

      default:
        errors = [`Unknown schema type: ${schema}`];
    }

    // In strict mode, warnings become errors
    if (strict && warnings.length > 0) {
      errors.push(...warnings);
      warnings = [];
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Optional JWT verification for authenticated validation
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';

      try {
        jwt.verify(token, jwtSecret);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            message: 'Provided token is invalid or expired',
          },
          { status: 401 }
        );
      }
    }

    // Parse and validate request body
    let requestBody: SchemaValidationRequest;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!requestBody.data || !requestBody.schema) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Both "data" and "schema" fields are required',
        },
        { status: 400 }
      );
    }

    // Validate data format
    if (!validateRequestData(requestBody.data)) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Data field must be a valid object',
        },
        { status: 400 }
      );
    }

    // Validate schema type
    if (!validateSchemaType(requestBody.schema)) {
      return NextResponse.json(
        {
          error: 'Invalid schema type',
          message: `Schema must be one of: registration, login, incomeEvent, payment, familyUpdate, emailVerification`,
        },
        { status: 400 }
      );
    }

    // Perform schema validation
    const validationResult = performSchemaValidation(
      requestBody.data,
      requestBody.schema,
      requestBody.strict || false
    );

    const response: SchemaValidationResponse = {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      schema: requestBody.schema,
      validatedAt: new Date().toISOString(),
    };

    // Return 200 for successful validation, 422 for validation errors
    const statusCode = validationResult.isValid ? 200 : 422;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Schema validation error:', error);

    if (error instanceof Error && error.message.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to validate schema. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available schemas and their descriptions
  const availableSchemas = {
    schemas: [
      {
        name: 'registration',
        description: 'User registration data validation',
        requiredFields: ['email', 'password', 'firstName', 'lastName', 'familyName'],
        optionalFields: ['timezone', 'currency'],
      },
      {
        name: 'login',
        description: 'User login data validation',
        requiredFields: ['email', 'password'],
        optionalFields: ['totpCode'],
      },
      {
        name: 'incomeEvent',
        description: 'Income event creation validation',
        requiredFields: ['sourceId', 'amount', 'receivedDate'],
        optionalFields: ['description', 'metadata'],
      },
      {
        name: 'payment',
        description: 'Payment data validation',
        requiredFields: ['payee', 'amount', 'dueDate', 'paymentType'],
        optionalFields: ['frequency'],
      },
      {
        name: 'familyUpdate',
        description: 'Family settings update validation',
        requiredFields: [],
        optionalFields: ['name', 'settings.timezone', 'settings.currency', 'settings.fiscalYearStart'],
      },
      {
        name: 'emailVerification',
        description: 'Email verification token validation',
        requiredFields: ['token'],
        optionalFields: ['userId'],
      },
    ],
    usage: {
      endpoint: '/api/schema/validate',
      method: 'POST',
      contentType: 'application/json',
      body: {
        data: 'object - The data to validate',
        schema: 'string - The schema type to validate against',
        strict: 'boolean - Whether to treat warnings as errors (optional)',
      },
    },
  };

  return NextResponse.json(availableSchemas, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}