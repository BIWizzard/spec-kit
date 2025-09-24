import { Request, Response } from 'express';
import { TransactionService } from '../../services/transaction.service';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface MatchPaymentsRequest {
  fromDate?: string;
  toDate?: string;
  accountIds?: string[];
}

export interface PaymentMatch {
  transactionId: string;
  paymentId: string;
  confidence: number;
  matchType: 'exact_amount' | 'close_amount' | 'merchant_match' | 'date_range';
}

export interface MatchPaymentsResponse {
  message: string;
  matches: PaymentMatch[];
  summary: {
    totalTransactions: number;
    totalMatches: number;
    highConfidenceMatches: number;
  };
}

export async function matchTransactionsToPayments(req: AuthenticatedRequest, res: Response) {
  try {
    const { fromDate, toDate, accountIds }: MatchPaymentsRequest = req.body || {};

    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7);
    let familyId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.familyId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }
      familyId = decoded.familyId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Build options for matching
      const options: any = {};

      if (fromDate || toDate) {
        options.dateRange = {};
        if (fromDate) {
          try {
            options.dateRange.start = new Date(fromDate);
          } catch (err) {
            return res.status(400).json({
              error: 'Invalid from date',
              message: 'Please provide from date in YYYY-MM-DD format.',
            });
          }
        }
        if (toDate) {
          try {
            options.dateRange.end = new Date(toDate);
          } catch (err) {
            return res.status(400).json({
              error: 'Invalid to date',
              message: 'Please provide to date in YYYY-MM-DD format.',
            });
          }
        }
      }

      if (accountIds && Array.isArray(accountIds) && accountIds.length > 0) {
        options.bankAccountIds = accountIds;
      }

      // Perform transaction matching
      const matchResults = await TransactionService.matchTransactionsToPayments(familyId, options);

      // Format matches
      const matches: PaymentMatch[] = matchResults.map((match) => ({
        transactionId: match.transactionId,
        paymentId: match.paymentId,
        confidence: match.matchConfidence,
        matchType: match.matchConfidence >= 0.9 ? 'exact_amount' :
                  match.matchConfidence >= 0.7 ? 'close_amount' :
                  match.matchConfidence >= 0.5 ? 'merchant_match' : 'date_range',
      }));

      // Calculate summary statistics
      const totalMatches = matches.length;
      const highConfidenceMatches = matches.filter(m => m.confidence >= 0.8).length;

      const response: MatchPaymentsResponse = {
        message: 'Transaction matching completed successfully.',
        matches,
        summary: {
          totalTransactions: matchResults.length, // This would be total processed in real implementation
          totalMatches,
          highConfidenceMatches,
        },
      };

      res.status(200).json(response);
    } catch (serviceError) {
      console.error('Match transactions to payments error:', serviceError);

      if (serviceError instanceof Error) {
        if (serviceError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Please provide dates in YYYY-MM-DD format.',
          });
        }
      }

      res.status(500).json({
        error: 'Failed to match transactions',
        message: 'Failed to match transactions to payments. Please try again.',
      });
    }
  } catch (error) {
    console.error('Match transactions to payments endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to match transactions to payments. Please try again.',
    });
  }
}