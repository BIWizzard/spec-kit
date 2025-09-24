import { Request, Response } from 'express';

export interface EnvironmentInfoResponse {
  environment: string;
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  timestamp: string;
  features: {
    plaidEnabled: boolean;
    emailEnabled: boolean;
    mfaEnabled: boolean;
    debugMode: boolean;
  };
}

export async function getEnvironmentInfo(req: Request, res: Response) {
  try {
    const response: EnvironmentInfoResponse = {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      features: {
        plaidEnabled: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
        emailEnabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
        mfaEnabled: true, // Always enabled in our implementation
        debugMode: process.env.NODE_ENV === 'development',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Environment info error:', error);

    res.status(500).json({
      error: 'Failed to get environment info',
      message: 'Failed to retrieve environment information. Please try again.',
    });
  }
}