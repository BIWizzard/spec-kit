import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface EnvironmentInfoResponse {
  environment: string;
  version: string;
  features: {
    emailEnabled: boolean;
    plaidEnabled: boolean;
    mfaEnabled: boolean;
    redisEnabled: boolean;
    analyticsEnabled: boolean;
  };
  limits: {
    maxFileUploadSize: number;
    maxRequestSize: number;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  build: {
    timestamp?: string;
    commit?: string;
    branch?: string;
  };
  regions?: string[];
  maintenance: {
    scheduled: boolean;
    message?: string;
  };
}

function getEnvironmentInfo(): EnvironmentInfoResponse {
  const environment = process.env.NODE_ENV || 'development';
  const version = process.env.npm_package_version || '1.0.0';

  // Determine feature availability based on environment variables
  const features = {
    emailEnabled: !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
    plaidEnabled: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    mfaEnabled: !!process.env.ENABLE_MFA || environment === 'production',
    redisEnabled: !!process.env.REDIS_URL,
    analyticsEnabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  };

  // System limits and configuration
  const limits = {
    maxFileUploadSize: parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760'), // 10MB default
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '1048576'), // 1MB default
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
  };

  // Build information (if available)
  const build = {
    timestamp: process.env.BUILD_TIMESTAMP,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT,
    branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH,
  };

  // Available regions (if multi-region deployment)
  const regions = process.env.AVAILABLE_REGIONS?.split(',') || undefined;

  // Maintenance mode information
  const maintenance = {
    scheduled: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE,
  };

  return {
    environment,
    version,
    features,
    limits,
    build,
    regions,
    maintenance,
  };
}

function isAuthenticatedRequest(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  try {
    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-jwt-secret-change-this-in-production-make-it-really-long';
    jwt.verify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
}

function getPublicEnvironmentInfo(): Partial<EnvironmentInfoResponse> {
  // Return limited information for unauthenticated requests
  return {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    features: {
      emailEnabled: !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
      plaidEnabled: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
      mfaEnabled: true, // Don't reveal actual MFA status
      redisEnabled: false, // Don't reveal infrastructure details
      analyticsEnabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    },
    maintenance: {
      scheduled: process.env.MAINTENANCE_MODE === 'true',
      message: process.env.MAINTENANCE_MESSAGE,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const isAuthenticated = isAuthenticatedRequest(authHeader);

    // Return different levels of detail based on authentication
    if (isAuthenticated) {
      const environmentInfo = getEnvironmentInfo();
      return NextResponse.json(environmentInfo, {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache', // Don't cache authenticated responses
        },
      });
    } else {
      const publicInfo = getPublicEnvironmentInfo();
      return NextResponse.json(publicInfo, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache public info for 5 minutes
        },
      });
    }
  } catch (error) {
    console.error('Environment info error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve environment information',
      },
      { status: 500 }
    );
  }
}

// Also support HEAD requests for uptime monitoring
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
    },
  });
}