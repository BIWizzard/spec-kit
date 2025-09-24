import { Request, Response } from 'express';
import { BankService } from '../../services/bank.service';
import { WebhookType } from 'plaid';

export interface PlaidWebhookRequest {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: any;
  new_transactions?: number;
  removed_transactions?: string[];
}

export interface SuccessResponse {
  message: string;
}

export async function handlePlaidWebhook(req: Request, res: Response) {
  try {
    const {
      webhook_type,
      webhook_code,
      item_id,
      error,
      new_transactions,
      removed_transactions,
    }: PlaidWebhookRequest = req.body;

    // Validate required webhook fields
    if (!webhook_type || !webhook_code || !item_id) {
      return res.status(400).json({
        error: 'Invalid webhook payload',
        message: 'Missing required webhook fields: webhook_type, webhook_code, or item_id.',
      });
    }

    // Validate webhook type
    const validWebhookTypes = Object.values(WebhookType);
    if (!validWebhookTypes.includes(webhook_type as WebhookType)) {
      return res.status(400).json({
        error: 'Invalid webhook type',
        message: 'Unsupported webhook type.',
      });
    }

    try {
      // Handle the webhook using the bank service
      await BankService.handlePlaidWebhook(
        webhook_type as WebhookType,
        webhook_code,
        item_id
      );

      const response: SuccessResponse = {
        message: 'Webhook processed successfully.',
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Plaid webhook processing error:', serviceError);

      // Log the error but still return success to Plaid
      // to avoid webhook retries for known errors
      if (serviceError instanceof Error) {
        if (serviceError.message.includes('No bank accounts found')) {
          console.warn(`No accounts found for Plaid item ${item_id}`);\n          return res.status(200).json({\n            message: 'Webhook acknowledged - no accounts found for item.',\n          });\n        }\n      }\n\n      // For other errors, still return success to avoid retries\n      // but log the error for investigation\n      console.error(`Failed to process webhook for item ${item_id}:`, serviceError);\n      \n      res.status(200).json({\n        message: 'Webhook acknowledged.',\n      });\n    }\n  } catch (error) {\n    console.error('Plaid webhook endpoint error:', error);\n\n    // Return success even on errors to prevent Plaid webhook retries\n    // The error is logged for investigation\n    res.status(200).json({\n      message: 'Webhook acknowledged.',\n    });\n  }\n}"}