import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  userId?: string;
  familyId?: string;
  requestId?: string;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  level: 'minimal' | 'standard' | 'detailed';
  includeHeaders?: boolean;
  includeBody?: boolean;
  includeResponse?: boolean;
  excludePaths?: string[];
  sensitiveFields?: string[];
}

const defaultOptions: LoggerOptions = {
  level: 'standard',
  includeHeaders: false,
  includeBody: false,
  includeResponse: false,
  excludePaths: ['/health', '/favicon.ico'],
  sensitiveFields: ['password', 'token', 'secret', 'auth', 'key'],
};

export function requestLogger(options: LoggerOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Skip logging for excluded paths
    if (opts.excludePaths?.some(path => req.path.includes(path))) {
      return next();
    }

    // Add request ID to request object
    (req as any).requestId = requestId;
    res.set('X-Request-ID', requestId);

    // Capture original res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const responseTime = Date.now() - startTime;

      const logEntry = createLogEntry(
        req,
        res,
        responseTime,
        requestId,
        opts
      );

      logRequest(logEntry, opts.level);

      return originalEnd.apply(this, args);
    };

    next();
  };
}

function createLogEntry(
  req: Request,
  res: Response,
  responseTime: number,
  requestId: string,
  options: LoggerOptions
): LogEntry {
  const user = (req as any).user;

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    requestId,
  };

  // Add user context if available
  if (user) {
    logEntry.userId = user.id;
    logEntry.familyId = user.familyId;
  }

  return logEntry;
}

function logRequest(logEntry: LogEntry, level: string) {
  const { method, url, statusCode, responseTime, requestId } = logEntry;

  // Determine log level based on status code
  const isError = statusCode >= 400;
  const isWarning = statusCode >= 300 && statusCode < 400;

  // Create base log message
  let message = `${method} ${url} ${statusCode} ${responseTime}ms`;

  if (level === 'minimal') {
    if (isError) {
      console.error(`[${requestId}] ${message}`);
    } else if (isWarning) {
      console.warn(`[${requestId}] ${message}`);
    } else {
      console.log(`[${requestId}] ${message}`);
    }
  } else {
    // Standard and detailed logging with structured data
    const logData = {
      requestId,
      timestamp: logEntry.timestamp,
      method: logEntry.method,
      url: logEntry.url,
      statusCode: logEntry.statusCode,
      responseTime: logEntry.responseTime,
      ip: logEntry.ip,
      userAgent: logEntry.userAgent,
    };

    if (logEntry.userId) {
      (logData as any).userId = logEntry.userId;
    }

    if (logEntry.familyId) {
      (logData as any).familyId = logEntry.familyId;
    }

    if (level === 'detailed') {
      message += ` | ${JSON.stringify(logData)}`;
    }

    if (isError) {
      console.error(message, level === 'standard' ? logData : undefined);
    } else if (isWarning) {
      console.warn(message, level === 'standard' ? logData : undefined);
    } else {
      console.info(message, level === 'standard' ? logData : undefined);
    }
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }

  const sanitized: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key], sensitiveFields);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }

  return sanitized;
}

// Error logging middleware
export function errorLogger(error: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || generateRequestId();
  const user = (req as any).user;

  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: user?.id,
    familyId: user?.familyId,
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  };

  console.error('Request Error:', errorLog);

  next(error);
}

// Security event logging
export function securityLogger(event: string, details: any, req: Request) {
  const requestId = (req as any).requestId || generateRequestId();
  const user = (req as any).user;

  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: user?.id,
    familyId: user?.familyId,
    details: sanitizeObject(details, defaultOptions.sensitiveFields || []),
  };

  console.warn('Security Event:', securityLog);
}

// Performance logging for slow requests
export function performanceLogger(threshold: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const responseTime = Date.now() - startTime;

      if (responseTime > threshold) {
        const requestId = (req as any).requestId || generateRequestId();
        const user = (req as any).user;

        const perfLog = {
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          url: req.originalUrl,
          responseTime,
          threshold,
          userId: user?.id,
          familyId: user?.familyId,
        };

        console.warn('Slow Request:', perfLog);
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
}

// Environment-specific logger configurations
export const loggerConfigurations = {
  development: requestLogger({
    level: 'detailed',
    includeHeaders: true,
  }),

  production: requestLogger({
    level: 'standard',
    excludePaths: ['/health', '/metrics', '/favicon.ico'],
  }),

  testing: requestLogger({
    level: 'minimal',
    excludePaths: ['/health', '/test'],
  }),
};

export function getLoggerConfig() {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return loggerConfigurations.production;
    case 'test':
      return loggerConfigurations.testing;
    default:
      return loggerConfigurations.development;
  }
}