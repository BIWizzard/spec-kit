import { Request, Response } from 'express';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface SchemaValidationRequest {
  schema: object;
  data: any;
}

export interface SchemaValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
  message: string;
}

export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
  data?: any;
}

export async function validateSchema(req: Request, res: Response) {
  try {
    const { schema, data }: SchemaValidationRequest = req.body;

    if (!schema || !data) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both schema and data are required for validation.',
      });
    }

    try {
      // Compile the schema
      const validate = ajv.compile(schema);

      // Validate the data
      const valid = validate(data);

      if (valid) {
        const response: SchemaValidationResponse = {
          valid: true,
          message: 'Data is valid according to the provided schema.',
        };

        res.status(200).json(response);
      } else {
        const errors: ValidationError[] = validate.errors?.map(error => ({
          instancePath: error.instancePath,
          schemaPath: error.schemaPath,
          keyword: error.keyword,
          message: error.message || 'Validation error',
          data: error.data,
        })) || [];

        const response: SchemaValidationResponse = {
          valid: false,
          errors,
          message: 'Data does not conform to the provided schema.',
        };

        res.status(422).json(response);
      }
    } catch (schemaError) {
      console.error('Schema compilation error:', schemaError);

      if (schemaError instanceof Error) {
        return res.status(400).json({
          error: 'Invalid schema',
          message: `Schema compilation failed: ${schemaError.message}`,
        });
      }

      return res.status(400).json({
        error: 'Invalid schema',
        message: 'The provided schema is not valid JSON Schema.',
      });
    }
  } catch (error) {
    console.error('Schema validation error:', error);

    res.status(500).json({
      error: 'Validation failed',
      message: 'Schema validation service encountered an error. Please try again.',
    });
  }
}

export async function validateOpenApiSpec(req: Request, res: Response) {
  try {
    const openApiSpec = req.body;

    if (!openApiSpec) {
      return res.status(400).json({
        error: 'Missing OpenAPI specification',
        message: 'OpenAPI specification is required for validation.',
      });
    }

    // Basic OpenAPI 3.0 structure validation
    const openApiSchema = {
      type: 'object',
      required: ['openapi', 'info', 'paths'],
      properties: {
        openapi: {
          type: 'string',
          pattern: '^3\\.0\\.[0-9]+$',
        },
        info: {
          type: 'object',
          required: ['title', 'version'],
          properties: {
            title: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
          },
        },
        paths: {
          type: 'object',
        },
        components: {
          type: 'object',
        },
        servers: {
          type: 'array',
        },
      },
    };

    const validate = ajv.compile(openApiSchema);
    const valid = validate(openApiSpec);

    if (valid) {
      res.status(200).json({
        valid: true,
        message: 'OpenAPI specification is valid.',
      });
    } else {
      const errors: ValidationError[] = validate.errors?.map(error => ({
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        keyword: error.keyword,
        message: error.message || 'Validation error',
        data: error.data,
      })) || [];

      res.status(422).json({
        valid: false,
        errors,
        message: 'OpenAPI specification is not valid.',
      });
    }
  } catch (error) {
    console.error('OpenAPI validation error:', error);

    res.status(500).json({
      error: 'Validation failed',
      message: 'OpenAPI validation service encountered an error. Please try again.',
    });
  }
}