import { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface OpenAPIPath {
  [method: string]: {
    parameters?: Array<{
      name: string;
      in: 'path' | 'query' | 'header' | 'body';
      required?: boolean;
      schema: any;
    }>;
    requestBody?: {
      required?: boolean;
      content: {
        [contentType: string]: {
          schema: any;
        };
      };
    };
    responses: {
      [statusCode: string]: any;
    };
  };
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: {
    [path: string]: OpenAPIPath;
  };
  components?: {
    schemas?: { [name: string]: any };
  };
}

let cachedSpec: OpenAPISpec | null = null;

export function loadOpenAPISpec(): OpenAPISpec {
  if (cachedSpec) {
    return cachedSpec;
  }

  const specPaths = [
    join(process.cwd(), 'docs', 'openapi.json'),
    join(process.cwd(), 'docs', 'openapi.yaml'),
    join(process.cwd(), 'openapi.json'),
    join(process.cwd(), 'openapi.yaml'),
  ];

  for (const specPath of specPaths) {
    if (existsSync(specPath)) {
      try {
        const content = readFileSync(specPath, 'utf8');
        if (specPath.endsWith('.json')) {
          cachedSpec = JSON.parse(content);
          return cachedSpec;
        }
        // For YAML, we'd need a YAML parser, but JSON is more common
      } catch (error) {
        console.warn(`Failed to load OpenAPI spec from ${specPath}:`, error);
      }
    }
  }

  // Generate minimal spec if no file found
  cachedSpec = generateDefaultSpec();
  return cachedSpec;
}

function generateDefaultSpec(): OpenAPISpec {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Family Finance API',
      version: '1.0.0',
    },
    paths: {
      '/api/health': {
        get: {
          responses: {
            '200': {
              description: 'Health check response',
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'firstName', 'lastName', 'familyName'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 12 },
                    firstName: { type: 'string', minLength: 1 },
                    lastName: { type: 'string', minLength: 1 },
                    familyName: { type: 'string', minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'User registered successfully' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
    },
  };
}

function normalizeOpenAPIPath(openApiPath: string): RegExp {
  // Convert OpenAPI path parameters to regex
  // /api/users/{id} -> /api/users/([^/]+)
  const regexPath = openApiPath
    .replace(/\{([^}]+)\}/g, '([^/]+)')
    .replace(/\//g, '\\/');

  return new RegExp(`^${regexPath}$`);
}

function findOpenAPIOperation(spec: OpenAPISpec, method: string, path: string) {
  for (const [specPath, pathItem] of Object.entries(spec.paths)) {
    const regex = normalizeOpenAPIPath(specPath);
    if (regex.test(path) && pathItem[method.toLowerCase()]) {
      return {
        operation: pathItem[method.toLowerCase()],
        pathParams: extractPathParams(specPath, path),
      };
    }
  }
  return null;
}

function extractPathParams(specPath: string, actualPath: string): { [key: string]: string } {
  const specParts = specPath.split('/');
  const actualParts = actualPath.split('/');
  const params: { [key: string]: string } = {};

  for (let i = 0; i < specParts.length; i++) {
    const specPart = specParts[i];
    const actualPart = actualParts[i];

    if (specPart && specPart.startsWith('{') && specPart.endsWith('}')) {
      const paramName = specPart.slice(1, -1);
      params[paramName] = actualPart || '';
    }
  }

  return params;
}

function validateSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema) {
    return { valid: true, errors: [] };
  }

  // Basic type validation
  if (schema.type && typeof data !== schema.type) {
    errors.push(`Expected type ${schema.type}, got ${typeof data}`);
    return { valid: false, errors };
  }

  // String validations
  if (schema.type === 'string') {
    if (schema.minLength && data.length < schema.minLength) {
      errors.push(`String too short. Minimum length: ${schema.minLength}`);
    }
    if (schema.maxLength && data.length > schema.maxLength) {
      errors.push(`String too long. Maximum length: ${schema.maxLength}`);
    }
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      errors.push('Invalid email format');
    }
    if (schema.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data)) {
      errors.push('Invalid UUID format');
    }
  }

  // Number validations
  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`Number too small. Minimum: ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`Number too large. Maximum: ${schema.maximum}`);
    }
  }

  // Object validations
  if (schema.type === 'object' && schema.properties) {
    if (typeof data !== 'object' || data === null) {
      errors.push('Expected object');
      return { valid: false, errors };
    }

    // Check required properties
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in data)) {
          errors.push(`Missing required property: ${requiredProp}`);
        }
      }
    }

    // Validate each property
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in data) {
        const propResult = validateSchema(data[propName], propSchema);
        if (!propResult.valid) {
          errors.push(...propResult.errors.map(err => `${propName}: ${err}`));
        }
      }
    }
  }

  // Array validations
  if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push('Expected array');
      return { valid: false, errors };
    }

    if (schema.minItems && data.length < schema.minItems) {
      errors.push(`Array too short. Minimum items: ${schema.minItems}`);
    }
    if (schema.maxItems && data.length > schema.maxItems) {
      errors.push(`Array too long. Maximum items: ${schema.maxItems}`);
    }

    // Validate array items
    if (schema.items) {
      for (let i = 0; i < data.length; i++) {
        const itemResult = validateSchema(data[i], schema.items);
        if (!itemResult.valid) {
          errors.push(...itemResult.errors.map(err => `[${i}]: ${err}`));
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateOpenAPI(options: {
  validateRequest?: boolean;
  validateResponse?: boolean;
  logErrors?: boolean;
} = {}) {
  const {
    validateRequest = true,
    validateResponse = false,
    logErrors = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest && !validateResponse) {
      return next();
    }

    try {
      const spec = loadOpenAPISpec();
      const operation = findOpenAPIOperation(spec, req.method, req.path);

      if (!operation) {
        // No OpenAPI spec found for this endpoint, skip validation
        return next();
      }

      const errors: string[] = [];

      if (validateRequest) {
        // Validate path parameters
        if (operation.operation.parameters) {
          const pathParams = operation.pathParams;

          for (const param of operation.operation.parameters) {
            if (param.in === 'path' && param.required && !pathParams[param.name]) {
              errors.push(`Missing required path parameter: ${param.name}`);
            }

            if (param.in === 'query' && param.required && !req.query[param.name]) {
              errors.push(`Missing required query parameter: ${param.name}`);
            }
          }
        }

        // Validate request body
        if (operation.operation.requestBody) {
          const contentType = req.get('Content-Type');
          const requestBody = operation.operation.requestBody;

          if (requestBody.required && !req.body) {
            errors.push('Request body is required');
          }

          if (req.body && requestBody.content) {
            let schema = null;

            // Try to find matching content type schema
            if (contentType && requestBody.content[contentType]) {
              schema = requestBody.content[contentType].schema;
            } else if (requestBody.content['application/json']) {
              schema = requestBody.content['application/json'].schema;
            }

            if (schema) {
              const validation = validateSchema(req.body, schema);
              if (!validation.valid) {
                errors.push(...validation.errors);
              }
            }
          }
        }
      }

      if (errors.length > 0) {
        if (logErrors) {
          console.error('OpenAPI validation errors:', {
            method: req.method,
            path: req.path,
            errors,
          });
        }

        return res.status(400).json({
          error: 'Request validation failed',
          message: 'The request does not conform to the API specification.',
          details: errors,
        });
      }

      // If response validation is enabled, wrap res.json to validate responses
      if (validateResponse) {
        const originalJson = res.json;
        res.json = function(body: any) {
          try {
            // Response validation would go here
            // For now, just pass through
            return originalJson.call(this, body);
          } catch (error) {
            if (logErrors) {
              console.error('Response validation error:', error);
            }
            return originalJson.call(this, body);
          }
        };
      }

      next();
    } catch (error) {
      if (logErrors) {
        console.error('OpenAPI validation middleware error:', error);
      }

      // Don't fail the request due to validation errors in production
      if (process.env.NODE_ENV === 'production') {
        return next();
      }

      return res.status(500).json({
        error: 'OpenAPI validation error',
        message: 'An error occurred while validating the request against the API specification.',
      });
    }
  };
}

export function reloadOpenAPISpec() {
  cachedSpec = null;
}

// Middleware for specific validation scenarios
export const validateRequestOnly = validateOpenAPI({
  validateRequest: true,
  validateResponse: false
});

export const validateResponseOnly = validateOpenAPI({
  validateRequest: false,
  validateResponse: true
});

export const validateBoth = validateOpenAPI({
  validateRequest: true,
  validateResponse: true
});

export const silentValidation = validateOpenAPI({
  validateRequest: true,
  validateResponse: false,
  logErrors: false
});