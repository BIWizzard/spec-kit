import { Request, Response, NextFunction } from 'express';

export interface CorsOptions {
  origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

const defaultOptions: CorsOptions = {
  origin: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: [],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export function cors(options: CorsOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');
    const requestMethod = req.method;
    const requestHeaders = req.get('Access-Control-Request-Headers');

    // Handle origin
    if (typeof opts.origin === 'function') {
      opts.origin(origin, (err, allow) => {
        if (err) {
          return next(err);
        }
        setCorsHeaders(res, opts, origin, allow);
        handlePreflightOrContinue(req, res, next, opts, requestMethod);
      });
    } else {
      const allow = isOriginAllowed(origin, opts.origin);
      setCorsHeaders(res, opts, origin, allow);
      handlePreflightOrContinue(req, res, next, opts, requestMethod);
    }
  };
}

function isOriginAllowed(origin: string | undefined, allowedOrigin: string | string[] | boolean | undefined): boolean {
  if (allowedOrigin === true) {
    return true;
  }

  if (allowedOrigin === false || !origin) {
    return false;
  }

  if (typeof allowedOrigin === 'string') {
    return origin === allowedOrigin;
  }

  if (Array.isArray(allowedOrigin)) {
    return allowedOrigin.includes(origin);
  }

  return false;
}

function setCorsHeaders(res: Response, options: CorsOptions, origin: string | undefined, allow: boolean | undefined) {
  // Set Access-Control-Allow-Origin
  if (allow && origin) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (options.origin === true) {
    res.set('Access-Control-Allow-Origin', '*');
  }

  // Set Vary header
  if (options.origin !== true) {
    res.set('Vary', 'Origin');
  }

  // Set Access-Control-Allow-Credentials
  if (options.credentials === true) {
    res.set('Access-Control-Allow-Credentials', 'true');
  }

  // Set Access-Control-Expose-Headers
  if (options.exposedHeaders && options.exposedHeaders.length > 0) {
    const headers = Array.isArray(options.exposedHeaders)
      ? options.exposedHeaders.join(',')
      : options.exposedHeaders;
    res.set('Access-Control-Expose-Headers', headers);
  }
}

function handlePreflightOrContinue(req: Request, res: Response, next: NextFunction, options: CorsOptions, requestMethod: string) {
  // Handle preflight request
  if (requestMethod === 'OPTIONS') {
    // Set Access-Control-Allow-Methods
    if (options.methods) {
      const methods = Array.isArray(options.methods)
        ? options.methods.join(',')
        : options.methods;
      res.set('Access-Control-Allow-Methods', methods);
    }

    // Set Access-Control-Allow-Headers
    if (options.allowedHeaders) {
      const headers = Array.isArray(options.allowedHeaders)
        ? options.allowedHeaders.join(',')
        : options.allowedHeaders;
      res.set('Access-Control-Allow-Headers', headers);
    } else {
      // Mirror the request headers
      const requestHeaders = req.get('Access-Control-Request-Headers');
      if (requestHeaders) {
        res.set('Access-Control-Allow-Headers', requestHeaders);
      }
    }

    // Set Access-Control-Max-Age
    if (options.maxAge) {
      res.set('Access-Control-Max-Age', options.maxAge.toString());
    }

    // End preflight request
    if (!options.preflightContinue) {
      res.status(options.optionsSuccessStatus || 204);
      res.set('Content-Length', '0');
      return res.end();
    }
  }

  next();
}

// Environment-specific CORS configurations
export const corsConfigurations = {
  development: cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
  }),

  production: cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      // Production domains
      const allowedOrigins = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://app.yourdomain.com',
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  }),

  testing: cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  }),

  // Restrictive CORS for sensitive endpoints
  restrictive: cors({
    origin: false, // No CORS allowed
    credentials: false,
  }),

  // API documentation endpoints (more permissive)
  docs: cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
};

// Get CORS configuration based on environment
export function getCorsConfig(): (req: Request, res: Response, next: NextFunction) => void {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return corsConfigurations.production;
    case 'test':
      return corsConfigurations.testing;
    default:
      return corsConfigurations.development;
  }
}

// Middleware to disable CORS for specific routes
export function disableCors(req: Request, res: Response, next: NextFunction) {
  res.removeHeader('Access-Control-Allow-Origin');
  res.removeHeader('Access-Control-Allow-Methods');
  res.removeHeader('Access-Control-Allow-Headers');
  res.removeHeader('Access-Control-Allow-Credentials');
  res.removeHeader('Access-Control-Expose-Headers');
  res.removeHeader('Access-Control-Max-Age');
  next();
}