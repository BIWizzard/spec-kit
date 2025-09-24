import { Request, Response } from 'express';
import { UserService } from '../../../services/user.service';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    familyId: string;
    email: string;
    role: string;
  };
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export async function setupMfa(req: AuthenticatedRequest, res: Response) {
  try {
    // Extract user from JWT token
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.',
        });
      }

      userId = decoded.userId;
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired.',
      });
    }

    try {
      // Setup MFA for the user
      const mfaSetup = await UserService.setupMfa(userId);

      // Generate QR code as base64 image
      const qrCodeData = await QRCode.toDataURL(mfaSetup.qrCodeUrl);

      const response: MfaSetupResponse = {
        secret: mfaSetup.secret,
        qrCode: qrCodeData,
        backupCodes: mfaSetup.backupCodes,
      };

      res.status(200).json(response);
    } catch (setupError) {
      console.error('MFA setup error:', setupError);

      if (setupError instanceof Error) {
        if (setupError.message === 'User not found') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The user account was not found.',
          });
        }
      }

      res.status(500).json({
        error: 'MFA setup failed',
        message: 'Failed to setup multi-factor authentication. Please try again.',
      });
    }
  } catch (error) {
    console.error('MFA setup endpoint error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: 'MFA setup failed. Please try again.',
    });
  }
}