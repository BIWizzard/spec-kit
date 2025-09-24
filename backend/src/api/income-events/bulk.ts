import { Request, Response } from 'express';
import { IncomeService } from '../../services/income.service';
import { ValidationService } from '../../services/validation.service';
import { FamilyService } from '../../services/family.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface BulkIncomeEventRequest {
  events: Array<{
    sourceId: string;
    amount: number;
    receivedDate: string;
    description?: string;
    metadata?: Record<string, any>;
  }>;
  validateOnly?: boolean;
}

export interface BulkIncomeEventResponse {
  message: string;
  results: {
    successful: number;
    failed: number;
    total: number;
  };
  createdEvents?: Array<{
    id: string;
    sourceId: string;
    sourceName: string;
    amount: number;
    receivedDate: string;
  }>;
  errors?: Array<{
    index: number;
    event: any;
    error: string;
    details?: string[];
  }>;
  validationResults?: Array<{
    index: number;
    event: any;
    isValid: boolean;
    errors?: string[];
  }>;
}

export async function bulkCreateIncomeEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const { events, validateOnly = false }: BulkIncomeEventRequest = req.body;

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let familyId: string;
    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.familyId || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      familyId = decoded.familyId;
      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    // Validate request structure
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Events array is required and cannot be empty.',
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        error: 'Too many events',
        message: 'Maximum 100 events allowed per bulk operation.',
      });
    }

    try {
      // Check user permissions (editors and admins can create income events)
      const user = await FamilyService.getFamilyMemberById(familyId, userId);
      if (!user || (!user.permissions.canEditPayments && user.role !== 'admin')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to create income events.',
        });
      }

      // Validate all events first
      const validationResults: Array<{
        index: number;
        event: any;
        isValid: boolean;
        errors?: string[];
      }> = [];

      events.forEach((event, index) => {
        const validationErrors = ValidationService.validateCreateIncomeEvent({
          sourceId: event.sourceId,
          amount: event.amount,
          receivedDate: event.receivedDate,
          description: event.description,
          metadata: event.metadata,
        });

        validationResults.push({
          index,
          event,
          isValid: validationErrors.length === 0,
          ...(validationErrors.length > 0 && { errors: validationErrors }),
        });
      });

      // If validation only, return validation results
      if (validateOnly) {
        const response: BulkIncomeEventResponse = {
          message: 'Bulk income events validation completed.',
          results: {
            successful: validationResults.filter(r => r.isValid).length,
            failed: validationResults.filter(r => !r.isValid).length,
            total: validationResults.length,
          },
          validationResults,
        };

        return res.status(200).json(response);
      }

      // Process valid events only
      const validEvents = validationResults
        .filter(result => result.isValid)
        .map(result => result.event);

      const createdEvents: any[] = [];
      const errors: Array<{
        index: number;
        event: any;
        error: string;
        details?: string[];
      }> = [];

      // Add validation errors to errors array
      validationResults
        .filter(result => !result.isValid)
        .forEach(result => {
          errors.push({
            index: result.index,
            event: result.event,
            error: 'Validation failed',
            details: result.errors,
          });
        });

      // Create valid events
      for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        const originalIndex = validationResults.findIndex(r => r.event === event);

        try {
          const createdEvent = await IncomeService.createIncomeEvent(familyId, {
            sourceId: event.sourceId,
            amount: event.amount,
            receivedDate: new Date(event.receivedDate),
            description: event.description || null,
            metadata: event.metadata || null,
            createdBy: userId,
          });

          createdEvents.push({
            id: createdEvent.id,
            sourceId: createdEvent.sourceId,
            sourceName: createdEvent.source.name,
            amount: createdEvent.amount.toNumber(),
            receivedDate: createdEvent.receivedDate.toISOString().split('T')[0],
          });
        } catch (createError) {
          errors.push({
            index: originalIndex,
            event,
            error: createError instanceof Error ? createError.message : 'Unknown error',
          });
        }
      }

      const response: BulkIncomeEventResponse = {
        message: `Bulk income events operation completed. ${createdEvents.length} created, ${errors.length} failed.`,
        results: {
          successful: createdEvents.length,
          failed: errors.length,
          total: events.length,
        },
        createdEvents,
        ...(errors.length > 0 && { errors }),
      };

      res.status(201).json(response);
    } catch (serviceError) {
      console.error('Bulk create income events error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message === 'Family not found') {
          return res.status(404).json({
            error: 'Family not found',
            message: 'The family was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to create income events',
        message: 'Failed to create income events in bulk. Please try again.',
      });
    }
  } catch (error) {
    console.error('Bulk create income events endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create income events in bulk. Please try again.',
    });
  }
}