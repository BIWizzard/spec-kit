import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationOptions {
  body?: object;
  query?: object;
  params?: object;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

export function validateRequest(schema: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    try {
      // Validate request body
      if (schema.body) {
        const bodyValidator = ajv.compile(schema.body);
        const isBodyValid = bodyValidator(req.body);

        if (!isBodyValid && bodyValidator.errors) {
          for (const error of bodyValidator.errors) {
            errors.push({
              field: `body${error.instancePath}`,
              message: error.message || 'Validation error',
              value: error.data,
            });
          }
        }
      }

      // Validate query parameters
      if (schema.query) {
        const queryValidator = ajv.compile(schema.query);
        const isQueryValid = queryValidator(req.query);

        if (!isQueryValid && queryValidator.errors) {
          for (const error of queryValidator.errors) {
            errors.push({
              field: `query${error.instancePath}`,
              message: error.message || 'Validation error',
              value: error.data,
            });
          }
        }
      }

      // Validate path parameters
      if (schema.params) {
        const paramsValidator = ajv.compile(schema.params);
        const isParamsValid = paramsValidator(req.params);

        if (!isParamsValid && paramsValidator.errors) {
          for (const error of paramsValidator.errors) {
            errors.push({
              field: `params${error.instancePath}`,
              message: error.message || 'Validation error',
              value: error.data,
            });
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Request validation failed. Please check the provided data.',
          details: errors,
        });
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);

      return res.status(500).json({
        error: 'Validation error',
        message: 'An error occurred while validating the request.',
      });
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  uuid: {
    type: 'string',
    format: 'uuid',
  },
  email: {
    type: 'string',
    format: 'email',
    maxLength: 255,
  },
  password: {
    type: 'string',
    minLength: 12,
    maxLength: 128,
  },
  currency: {
    type: 'number',
    multipleOf: 0.01,
    minimum: 0,
  },
  date: {
    type: 'string',
    format: 'date',
  },
  datetime: {
    type: 'string',
    format: 'date-time',
  },
  pagination: {
    type: 'object',
    properties: {
      page: {
        type: 'string',
        pattern: '^[1-9][0-9]*$',
      },
      limit: {
        type: 'string',
        pattern: '^[1-9][0-9]*$',
      },
      sort: {
        type: 'string',
        maxLength: 50,
      },
      order: {
        type: 'string',
        enum: ['asc', 'desc'],
      },
    },
    additionalProperties: false,
  },
} as const;

// Specific validation middleware for common patterns
export function validateUuidParam(paramName: string) {
  return validateRequest({
    params: {
      type: 'object',
      properties: {
        [paramName]: commonSchemas.uuid,
      },
      required: [paramName],
      additionalProperties: true,
    },
  });
}

export function validatePagination() {
  return validateRequest({
    query: commonSchemas.pagination,
  });
}

export function validateDateRange() {
  return validateRequest({
    query: {
      type: 'object',
      properties: {
        startDate: commonSchemas.date,
        endDate: commonSchemas.date,
      },
      additionalProperties: true,
    },
  });
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize string inputs to prevent XSS
    function sanitizeObject(obj: any): any {
      if (typeof obj === 'string') {
        return obj.trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }

      return obj;
    }

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);

    return res.status(500).json({
      error: 'Input sanitization failed',
      message: 'An error occurred while processing the request.',
    });
  }
}