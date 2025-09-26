import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PlaidIntegrationService, PlaidWebhookData } from '@/lib/services/plaid-integration.service';

export interface PlaidWebhookRequest {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: any;
  new_transactions?: number;
  removed_transactions?: string[];
  consent_expiration_time?: string;
  environment: string;
}

/**
 * POST /api/plaid/webhook
 *
 * Handles Plaid webhook events for real-time updates about:
 * - Transaction updates (new, modified, removed)
 * - Item status changes (login required, error states)
 * - Account holder identity updates
 * - Authentication status changes
 *
 * Webhook events are verified using HMAC signature validation
 * to ensure they originate from Plaid's servers.
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook signature for verification
    const plaidSignature = request.headers.get('plaid-verification');

    if (!plaidSignature) {
      console.error('Missing Plaid verification signature');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature
    const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('PLAID_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (plaidSignature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse validated request body
    const webhookData: PlaidWebhookRequest = JSON.parse(body);

    console.log(`Received Plaid webhook: ${webhookData.webhook_type}.${webhookData.webhook_code} for item ${webhookData.item_id}`);

    // Transform Plaid webhook format to internal format
    const internalWebhookData: PlaidWebhookData = {
      webhookType: webhookData.webhook_type as any,
      webhookCode: webhookData.webhook_code,
      itemId: webhookData.item_id,
      error: webhookData.error,
      newTransactions: webhookData.new_transactions,
      removedTransactions: webhookData.removed_transactions,
      consentExpirationTime: webhookData.consent_expiration_time,
    };

    // Process webhook using PlaidIntegrationService
    await PlaidIntegrationService.handleWebhook(internalWebhookData);

    console.log(`Successfully processed webhook: ${webhookData.webhook_type}.${webhookData.webhook_code}`);

    // Return success response (Plaid expects 200 OK)
    return NextResponse.json({
      status: 'success',
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing Plaid webhook:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}