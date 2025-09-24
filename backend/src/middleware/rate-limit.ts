import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
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

      // Get current request count
      const current = await store.get(key);
      let totalRequests = 1;

      if (current && now < current.resetTime) {
        totalRequests = current.totalRequests + 1;
      }

      // Store updated count
      await store.set(key, { totalRequests, resetTime: current?.resetTime || resetTime });

      // Calculate remaining requests and reset time
      const remaining = Math.max(0, max - totalRequests);
      const resetTimeInSeconds = Math.ceil((current?.resetTime || resetTime) / 1000);

      // Add standard headers
      if (standardHeaders) {
        res.set({
          'RateLimit-Limit': max.toString(),
          'RateLimit-Remaining': remaining.toString(),
          'RateLimit-Reset': resetTimeInSeconds.toString(),
        });
      }

      // Add legacy headers for backward compatibility
      if (legacyHeaders) {
        res.set({
          'X-RateLimit-Limit': max.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTimeInSeconds.toString(),
        });
      }

      // Check if limit exceeded
      if (totalRequests > max) {
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

// Preset configurations for different rate limits
export const rateLimitPresets = {
  // General API requests
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),

  // Authentication endpoints (stricter)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
  }),

  // Password reset (very strict)
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per hour
    message: 'Too many password reset attempts, please try again later.',
  }),

  // File upload (moderate)
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 uploads per minute
    message: 'Too many uploads, please try again later.',
  }),

  // API documentation (lenient)
  docs: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // limit each IP to 50 requests per minute
  }),

  // Health checks (very lenient)
  health: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per minute
  }),
};

// User-based rate limiting (requires authentication)
export function userRateLimit(options: RateLimitOptions & { userIdField?: string }) {
  const { userIdField = 'id', ...rateLimitOptions } = options;

  return rateLimit({
    ...rateLimitOptions,
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user && user[userIdField]) {
        return `user:${user[userIdField]}`;
      }
      return req.ip || 'anonymous';
    },
  });
}

// Family-based rate limiting
export function familyRateLimit(options: RateLimitOptions) {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      const user = (req as any).user;
      if (user && user.familyId) {
        return `family:${user.familyId}`;
      }
      return req.ip || 'anonymous';
    },
  });
}