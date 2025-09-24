export interface EnvironmentRateLimits {
  development: RateLimitTier;
  staging: RateLimitTier;
  production: RateLimitTier;
}

export interface RateLimitTier {
  general: RateLimitConfig;
  auth: RateLimitConfig;
  passwordReset: RateLimitConfig;
  bankSync: RateLimitConfig;
  fileUpload: RateLimitConfig;
  reportExport: RateLimitConfig;
  api: RateLimitConfig;
  health: RateLimitConfig;
  docs: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const ENVIRONMENT_RATE_LIMITS: EnvironmentRateLimits = {
  development: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Very generous for development
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 100, // Generous for testing
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // Generous for testing
      message: 'Too many password reset attempts, please try again later.',
    },
    bankSync: {
      windowMs: 60 * 1000, // 1 minute
      max: 50, // Generous for testing bank integrations
      message: 'Too many bank sync requests, please try again later.',
    },
    fileUpload: {
      windowMs: 60 * 1000,
      max: 50,
      message: 'Too many uploads, please try again later.',
    },
    reportExport: {
      windowMs: 60 * 1000,
      max: 50,
      message: 'Too many export requests, please try again later.',
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
    },
    health: {
      windowMs: 1 * 60 * 1000,
      max: 1000,
    },
    docs: {
      windowMs: 1 * 60 * 1000,
      max: 100,
    },
  },
  staging: {
    general: {
      windowMs: 15 * 60 * 1000,
      max: 200, // Moderate for staging testing
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: 'Too many password reset attempts, please try again later.',
    },
    bankSync: {
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many bank sync requests, please try again later.',
    },
    fileUpload: {
      windowMs: 60 * 1000,
      max: 20,
      message: 'Too many uploads, please try again later.',
    },
    reportExport: {
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many export requests, please try again later.',
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: 200,
    },
    health: {
      windowMs: 1 * 60 * 1000,
      max: 200,
    },
    docs: {
      windowMs: 1 * 60 * 1000,
      max: 100,
    },
  },
  production: {
    general: {
      windowMs: 15 * 60 * 1000,
      max: 100, // Standard production limits
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5, // Strict for production security
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000,
      max: 3, // Very strict for security
      message: 'Too many password reset attempts, please try again later.',
    },
    bankSync: {
      windowMs: 60 * 1000,
      max: 3, // Limited to prevent API abuse
      message: 'Too many bank sync requests, please try again later.',
    },
    fileUpload: {
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many uploads, please try again later.',
    },
    reportExport: {
      windowMs: 60 * 1000,
      max: 5, // Limited for resource management
      message: 'Too many export requests, please try again later.',
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    health: {
      windowMs: 1 * 60 * 1000,
      max: 100,
    },
    docs: {
      windowMs: 1 * 60 * 1000,
      max: 50,
    },
  },
};

export function getRateLimitConfig(environment: keyof EnvironmentRateLimits, type: keyof RateLimitTier): RateLimitConfig {
  const envConfig = ENVIRONMENT_RATE_LIMITS[environment];
  if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  const rateLimitConfig = envConfig[type];
  if (!rateLimitConfig) {
    throw new Error(`Unknown rate limit type: ${type}`);
  }

  return rateLimitConfig;
}

export function getCurrentEnvironment(): keyof EnvironmentRateLimits {
  const nodeEnv = process.env.NODE_ENV as keyof EnvironmentRateLimits;
  if (!nodeEnv || !ENVIRONMENT_RATE_LIMITS[nodeEnv]) {
    return 'development';
  }
  return nodeEnv;
}

// User-tier based rate limits (applied per authenticated user)
export interface UserTierRateLimits {
  free: Partial<RateLimitTier>;
  premium: Partial<RateLimitTier>;
  family: Partial<RateLimitTier>;
}

export const USER_TIER_RATE_LIMITS: UserTierRateLimits = {
  free: {
    bankSync: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limited syncs per hour for free tier
      message: 'Free tier bank sync limit reached. Upgrade for more syncs.',
    },
    reportExport: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 5, // 5 exports per day
      message: 'Free tier export limit reached. Upgrade for unlimited exports.',
    },
  },
  premium: {
    bankSync: {
      windowMs: 60 * 60 * 1000,
      max: 100, // Higher limit for premium
      message: 'Premium bank sync limit reached.',
    },
    reportExport: {
      windowMs: 24 * 60 * 60 * 1000,
      max: 50,
      message: 'Premium export limit reached.',
    },
  },
  family: {
    bankSync: {
      windowMs: 60 * 60 * 1000,
      max: 200, // Highest limit for family plans
      message: 'Family plan bank sync limit reached.',
    },
    reportExport: {
      windowMs: 24 * 60 * 60 * 1000,
      max: 100,
      message: 'Family plan export limit reached.',
    },
  },
};

export function getUserTierRateLimit(userTier: keyof UserTierRateLimits, type: keyof RateLimitTier): RateLimitConfig | null {
  const tierConfig = USER_TIER_RATE_LIMITS[userTier];
  if (!tierConfig || !tierConfig[type]) {
    return null;
  }
  return tierConfig[type] as RateLimitConfig;
}

// IP-based special handling
export const IP_ALLOWLIST = [
  '127.0.0.1', // localhost
  '::1', // localhost IPv6
  // Add specific IPs that need higher limits (monitoring services, etc.)
];

export const IP_RATE_LIMIT_MULTIPLIERS = {
  allowlisted: 10, // 10x higher limits for allowlisted IPs
  suspicious: 0.1, // 10x lower limits for suspicious IPs
};

export function getIPRateLimitMultiplier(ip: string): number {
  if (IP_ALLOWLIST.includes(ip)) {
    return IP_RATE_LIMIT_MULTIPLIERS.allowlisted;
  }
  // Could add logic to check if IP is flagged as suspicious
  return 1;
}