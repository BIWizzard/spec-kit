import { Request, Response, NextFunction } from 'express';

export interface SecurityOptions {
  contentSecurityPolicy?: {
    enabled?: boolean;
    directives?: {
      [directive: string]: string[] | string | boolean;
    };
  };
  hsts?: {
    enabled?: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  noSniff?: boolean;
  xssProtection?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: {
    [feature: string]: string[];
  };
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
  expectCertificateTransparency?: boolean;
}

const defaultSecurityOptions: SecurityOptions = {
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'https:'],
      'connect-src': ["'self'", 'https://api.plaid.com'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true,
    },
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    interest_cohort: [],
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  expectCertificateTransparency: true,
};

function formatCSPDirectives(directives: { [directive: string]: string[] | string | boolean }): string {
  const policies: string[] = [];

  for (const [directive, value] of Object.entries(directives)) {
    if (value === true) {
      policies.push(directive);
    } else if (Array.isArray(value) && value.length > 0) {
      policies.push(`${directive} ${value.join(' ')}`);
    } else if (typeof value === 'string') {
      policies.push(`${directive} ${value}`);
    }
  }

  return policies.join('; ');
}

function formatPermissionsPolicy(permissions: { [feature: string]: string[] }): string {
  const policies: string[] = [];

  for (const [feature, allowlist] of Object.entries(permissions)) {
    if (allowlist.length === 0) {
      policies.push(`${feature}=()`);
    } else {
      policies.push(`${feature}=(${allowlist.join(' ')})`);
    }
  }

  return policies.join(', ');
}

export function securityHeaders(options: SecurityOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...defaultSecurityOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Content Security Policy
      if (config.contentSecurityPolicy?.enabled && config.contentSecurityPolicy.directives) {
        const cspValue = formatCSPDirectives(config.contentSecurityPolicy.directives);
        res.setHeader('Content-Security-Policy', cspValue);
        res.setHeader('X-Content-Security-Policy', cspValue); // Older browsers
      }

      // HTTP Strict Transport Security (HSTS)
      if (config.hsts?.enabled && req.secure) {
        let hstsValue = `max-age=${config.hsts.maxAge || 31536000}`;

        if (config.hsts.includeSubDomains) {
          hstsValue += '; includeSubDomains';
        }

        if (config.hsts.preload) {
          hstsValue += '; preload';
        }

        res.setHeader('Strict-Transport-Security', hstsValue);
      }

      // X-Content-Type-Options
      if (config.noSniff) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection (deprecated but still useful for older browsers)
      if (config.xssProtection) {
        res.setHeader('X-XSS-Protection', '1; mode=block');
      }

      // Referrer Policy
      if (config.referrerPolicy) {
        res.setHeader('Referrer-Policy', config.referrerPolicy);
      }

      // Permissions Policy
      if (config.permissionsPolicy) {
        const permissionsValue = formatPermissionsPolicy(config.permissionsPolicy);
        res.setHeader('Permissions-Policy', permissionsValue);
      }

      // Cross-Origin Embedder Policy
      if (config.crossOriginEmbedderPolicy) {
        res.setHeader('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);
      }

      // Cross-Origin Opener Policy
      if (config.crossOriginOpenerPolicy) {
        res.setHeader('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);
      }

      // Cross-Origin Resource Policy
      if (config.crossOriginResourcePolicy) {
        res.setHeader('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);
      }

      // X-Frame-Options (redundant with CSP frame-ancestors, but good fallback)
      res.setHeader('X-Frame-Options', 'DENY');

      // X-Download-Options (IE-specific)
      res.setHeader('X-Download-Options', 'noopen');

      // X-Permitted-Cross-Domain-Policies
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

      // Expect-Certificate-Transparency
      if (config.expectCertificateTransparency && req.secure) {
        res.setHeader('Expect-CT', 'max-age=86400, enforce');
      }

      // Remove potentially dangerous headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Custom security headers for financial applications
      res.setHeader('X-Finance-App-Version', '1.0.0');
      res.setHeader('X-Security-Policy', 'strict');

      next();
    } catch (error) {
      console.error('Security headers middleware error:', error);

      // Don't fail the request, but log the error
      next();
    }
  };
}

// Preset configurations for different environments
export const developmentSecurity = securityHeaders({
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:', 'localhost:*'],
      'font-src': ["'self'", 'https:', 'data:'],
      'connect-src': ["'self'", 'https://api.plaid.com', 'ws://localhost:*', 'localhost:*'],
      'frame-src': ["'self'", 'https://cdn.plaid.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
  },
  hsts: {
    enabled: false, // Usually disabled in development
  },
});

export const productionSecurity = securityHeaders({
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https://trusted-cdn.com'],
      'font-src': ["'self'"],
      'connect-src': ["'self'", 'https://api.plaid.com'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true,
    },
  },
  hsts: {
    enabled: true,
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
});

export const apiSecurity = securityHeaders({
  contentSecurityPolicy: {
    enabled: false, // APIs don't need CSP
  },
  hsts: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: 'no-referrer',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    interest_cohort: [],
    payment: [],
    usb: [],
    serial: [],
  },
});

// Middleware for sensitive financial operations
export const financialDataSecurity = securityHeaders({
  contentSecurityPolicy: {
    enabled: true,
    directives: {
      'default-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'none'"],
      'font-src': ["'none'"],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'none'"],
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true,
    },
  },
  hsts: {
    enabled: true,
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'no-referrer',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-site',
});