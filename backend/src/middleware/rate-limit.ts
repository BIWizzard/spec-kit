import { Request, Response, NextFunction } from 'express';
import {
  getRateLimitConfig,
  getCurrentEnvironment,
  getUserTierRateLimit,
  getIPRateLimitMultiplier,
  RateLimitConfig
} from '../config/rate-limits';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number | ((req: Request) => number); // Maximum number of requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitStore {
  get(key: string): Promise<{ totalRequests: number; resetTime: number } | undefined>;
  set(key: string, value: { totalRequests: number; resetTime: number }): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, { totalRequests: number; resetTime: number }>();

  async get(key: string) {
    const data = this.store.get(key);
    if (!data) return undefined;

    // Clean up expired entries
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return data;
  }

  async set(key: string, value: { totalRequests: number; resetTime: number }) {
    this.store.set(key, value);
  }

  // Clean up expired entries periodically
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }
}

const defaultStore = new MemoryStore();
defaultStore.startCleanup();

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || 'anonymous',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  const store = defaultStore;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const resetTime = now + windowMs;

      // Calculate max requests (support dynamic max)
      const maxRequests = typeof max === 'function' ? max(req) : max;

      // Get current request count
      const current = await store.get(key);
      let totalRequests = 1;

      if (current && now < current.resetTime) {
        totalRequests = current.totalRequests + 1;
      }

      // Store updated count
      await store.set(key, { totalRequests, resetTime: current?.resetTime || resetTime });

      // Calculate remaining requests and reset time
      const remaining = Math.max(0, maxRequests - totalRequests);
      const resetTimeInSeconds = Math.ceil((current?.resetTime || resetTime) / 1000);

      // Add standard headers
      if (standardHeaders) {
        res.set({
          'RateLimit-Limit': maxRequests.toString(),
          'RateLimit-Remaining': remaining.toString(),
          'RateLimit-Reset': resetTimeInSeconds.toString(),
        });
      }

      // Add legacy headers for backward compatibility
      if (legacyHeaders) {
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTimeInSeconds.toString(),
        });
      }

      // Check if limit exceeded
      if (totalRequests > maxRequests) {
        res.set('Retry-After', Math.ceil(windowMs / 1000).toString());

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      // Hook into response to track success/failure
      const originalSend = res.send;
      res.send = function(data) {
        const shouldCount = !(
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400)
        );

        if (!shouldCount) {
          // Decrement count if we're skipping this request
          store.set(key, {
            totalRequests: Math.max(0, totalRequests - 1),
            resetTime: current?.resetTime || resetTime
          });
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // If rate limiting fails, allow the request to continue
      next();
    }
  };
}

// Environment-aware preset configurations
export const rateLimitPresets = {
  // General API requests
  general: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'general');
    return rateLimit(config);
  },

  // Authentication endpoints (stricter)
  auth: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'auth');
    return rateLimit(config);
  },

  // Password reset (very strict)
  passwordReset: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'passwordReset');
    return rateLimit(config);
  },

  // Bank sync (resource intensive)
  bankSync: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'bankSync');
    return rateLimit(config);
  },

  // File upload (moderate)
  fileUpload: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'fileUpload');
    return rateLimit(config);
  },

  // Report export (resource intensive)
  reportExport: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'reportExport');
    return rateLimit(config);
  },

  // API documentation (lenient)
  docs: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'docs');
    return rateLimit(config);
  },

  // Health checks (very lenient)
  health: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'health');
    return rateLimit(config);
  },

  // General API (same as general, for backward compatibility)
  api: () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), 'api');
    return rateLimit(config);
  },
};

// User-based rate limiting with tier support (requires authentication)
export function userRateLimit(
  rateLimitType: keyof import('../config/rate-limits').RateLimitTier,
  options?: { userIdField?: string }
) {
  const { userIdField = 'id' } = options || {};

  return rateLimit({
    ...getRateLimitConfig(getCurrentEnvironment(), rateLimitType),
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user && user[userIdField]) {
        return `user:${user[userIdField]}`;
      }
      return req.ip || 'anonymous';
    },
    // Override with user tier limits if applicable
    max: (req) => {
      const user = (req as any).user;
      const ip = req.ip || 'unknown';
      const baseConfig = getRateLimitConfig(getCurrentEnvironment(), rateLimitType);
      let max = baseConfig.max;

      // Apply user tier limits
      if (user && user.tier) {
        const tierConfig = getUserTierRateLimit(user.tier, rateLimitType);
        if (tierConfig && tierConfig.max) {
          max = tierConfig.max;
        }
      }

      // Apply IP multipliers
      const multiplier = getIPRateLimitMultiplier(ip);
      return Math.ceil(max * multiplier);
    },
  });
}

// Family-based rate limiting with environment awareness
export function familyRateLimit(rateLimitType: keyof import('../config/rate-limits').RateLimitTier) {
  return rateLimit({
    ...getRateLimitConfig(getCurrentEnvironment(), rateLimitType),
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user && user.familyId) {
        return `family:${user.familyId}`;
      }
      return req.ip || 'anonymous';
    },
    // Apply IP multipliers
    max: (req) => {
      const ip = req.ip || 'unknown';
      const baseConfig = getRateLimitConfig(getCurrentEnvironment(), rateLimitType);
      const multiplier = getIPRateLimitMultiplier(ip);
      return Math.ceil(baseConfig.max * multiplier);
    },
  });
}

// Enhanced rate limit factory for specific endpoint types
export function createEnvironmentRateLimit(rateLimitType: keyof import('../config/rate-limits').RateLimitTier) {
  return () => {
    const config = getRateLimitConfig(getCurrentEnvironment(), rateLimitType);
    return rateLimit({
      ...config,
      max: (req) => {
        const ip = req.ip || 'unknown';
        const multiplier = getIPRateLimitMultiplier(ip);
        return Math.ceil(config.max * multiplier);
      },
    });
  };
}