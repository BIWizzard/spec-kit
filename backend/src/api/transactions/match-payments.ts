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
      const options: any = {};\n\n      if (fromDate || toDate) {\n        options.dateRange = {};\n        if (fromDate) {\n          try {\n            options.dateRange.start = new Date(fromDate);\n          } catch (err) {\n            return res.status(400).json({\n              error: 'Invalid from date',\n              message: 'Please provide from date in YYYY-MM-DD format.',\n            });\n          }\n        }\n        if (toDate) {\n          try {\n            options.dateRange.end = new Date(toDate);\n          } catch (err) {\n            return res.status(400).json({\n              error: 'Invalid to date',\n              message: 'Please provide to date in YYYY-MM-DD format.',\n            });\n          }\n        }\n      }\n\n      if (accountIds && Array.isArray(accountIds) && accountIds.length > 0) {\n        options.bankAccountIds = accountIds;\n      }\n\n      // Perform transaction matching\n      const matchResults = await TransactionService.matchTransactionsToPayments(familyId, options);\n\n      // Format matches\n      const matches: PaymentMatch[] = matchResults.map((match) => ({\n        transactionId: match.transactionId,\n        paymentId: match.paymentId,\n        confidence: match.matchConfidence,\n        matchType: match.matchConfidence >= 0.9 ? 'exact_amount' :\n                  match.matchConfidence >= 0.7 ? 'close_amount' :\n                  match.matchConfidence >= 0.5 ? 'merchant_match' : 'date_range',\n      }));\n\n      // Calculate summary statistics\n      const totalMatches = matches.length;\n      const highConfidenceMatches = matches.filter(m => m.confidence >= 0.8).length;\n\n      const response: MatchPaymentsResponse = {\n        message: 'Transaction matching completed successfully.',\n        matches,\n        summary: {\n          totalTransactions: matchResults.length, // This would be total processed in real implementation\n          totalMatches,\n          highConfidenceMatches,\n        },\n      };\n\n      res.status(200).json(response);\n    } catch (serviceError) {\n      console.error('Match transactions to payments error:', serviceError);\n\n      if (serviceError instanceof Error) {\n        if (serviceError.message.includes('Invalid date')) {\n          return res.status(400).json({\n            error: 'Invalid date format',\n            message: 'Please provide dates in YYYY-MM-DD format.',\n          });\n        }\n      }\n\n      res.status(500).json({\n        error: 'Failed to match transactions',\n        message: 'Failed to match transactions to payments. Please try again.',\n      });\n    }\n  } catch (error) {\n    console.error('Match transactions to payments endpoint error:', error);\n\n    res.status(500).json({\n      error: 'Internal server error',\n      message: 'Failed to match transactions to payments. Please try again.',\n    });\n  }\n}"}