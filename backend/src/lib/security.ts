import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { logger } from './logger'
import { sentry } from './sentry'

const scryptAsync = promisify(scrypt)

export interface SecurityConfig {
  environment: 'development' | 'staging' | 'production'
  strictMode: boolean
  rateLimit: {
    enabled: boolean
    windowMs?: number
    maxRequests?: number
  }
  csrfProtection: boolean
  contentSecurityPolicy: boolean
  encryptionKey?: string
}

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'csrf_violation' | 'xss_attempt' | 'sql_injection'
  ip: string
  userAgent?: string
  endpoint?: string
  userId?: string
  details?: Record<string, any>
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class SecurityManager {
  private config: SecurityConfig
  private blockedIPs = new Map<string, Date>()
  private suspiciousActivity = new Map<string, number>()
  private failedAttempts = new Map<string, { count: number; firstAttempt: Date }>()

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      environment: (process.env.NODE_ENV as any) || 'development',
      strictMode: process.env.NODE_ENV === 'production',
      rateLimit: {
        enabled: process.env.NODE_ENV === 'production',
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      },
      csrfProtection: process.env.NODE_ENV === 'production',
      contentSecurityPolicy: true,
      encryptionKey: process.env.ENCRYPTION_KEY,
      ...config
    }
  }

  // Security Headers Middleware
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: this.config.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            this.config.environment === 'development' ? "'unsafe-inline'" : '',
            "https://vercel.live",
            "https://js.sentry-cdn.com",
            "https://va.vercel-scripts.com"
          ].filter(Boolean),
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com"
          ],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: [
            "'self'",
            "https://api.plaid.com",
            "https://production.plaid.com",
            "https://sentry.io",
            "https://vitals.vercel-analytics.com",
            "wss:"
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        },
        reportUri: '/api/security/csp-report'
      } : false,
      hsts: this.config.strictMode ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      xssFilter: true,
      noSniff: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    })
  }

  // Rate Limiting Middleware
  rateLimitMiddleware(options?: { windowMs?: number; maxRequests?: number; skipSuccessfulRequests?: boolean }) {
    if (!this.config.rateLimit.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next()
    }

    const rateLimiter = rateLimit({
      windowMs: options?.windowMs || this.config.rateLimit.windowMs || 15 * 60 * 1000,
      max: options?.maxRequests || this.config.rateLimit.maxRequests || 100,
      skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'rate_limit',
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'medium',
          details: {
            method: req.method,
            rateLimitExceeded: true
          }
        })

        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((options?.windowMs || 15 * 60 * 1000) / 1000)
        })
      },
      standardHeaders: true,
      legacyHeaders: false
    })

    return rateLimiter
  }

  // Authentication Rate Limiting (stricter)
  authRateLimitMiddleware() {
    return this.rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per window
      skipSuccessfulRequests: true
    })
  }

  // IP Blocking Middleware
  ipBlockingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req)
      const blockedUntil = this.blockedIPs.get(clientIP)

      if (blockedUntil && new Date() < blockedUntil) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          ip: clientIP,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'high',
          details: {
            reason: 'blocked_ip_access_attempt',
            blockedUntil: blockedUntil.toISOString()
          }
        })

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address has been temporarily blocked due to suspicious activity.'
        })
      }

      next()
    }
  }

  // Input Sanitization Middleware
  inputSanitizationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body)
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query)
        }

        next()
      } catch (error) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          ip: this.getClientIP(req),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'medium',
          details: {
            reason: 'input_sanitization_error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })

        res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains invalid or potentially malicious data.'
        })
      }
    }
  }

  // XSS Protection Middleware
  xssProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /document\.cookie/gi,
        /document\.write/gi
      ]

      const checkForXSS = (data: any): boolean => {
        if (typeof data === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(data))
        }
        if (typeof data === 'object' && data !== null) {
          return Object.values(data).some(value => checkForXSS(value))
        }
        return false
      }

      if (checkForXSS(req.body) || checkForXSS(req.query)) {
        this.logSecurityEvent({
          type: 'xss_attempt',
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'high',
          details: {
            method: req.method,
            suspiciousData: 'XSS patterns detected'
          }
        })

        return res.status(400).json({
          error: 'Security violation',
          message: 'Request contains potentially malicious content.'
        })
      }

      next()
    }
  }

  // SQL Injection Protection Middleware
  sqlInjectionProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /'(\s*(OR|AND)\s*'?\d)/gi,
        /'(\s*OR\s*'?1'?\s*=\s*'?1)/gi,
        /--/g,
        /\/\*[\s\S]*?\*\//g,
        /;\s*(DROP|DELETE|INSERT|UPDATE)/gi
      ]

      const checkForSQLInjection = (data: any): boolean => {
        if (typeof data === 'string') {
          return sqlPatterns.some(pattern => pattern.test(data))
        }
        if (typeof data === 'object' && data !== null) {
          return Object.values(data).some(value => checkForSQLInjection(value))
        }
        return false
      }

      if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query)) {
        this.logSecurityEvent({
          type: 'sql_injection',
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'critical',
          details: {
            method: req.method,
            suspiciousData: 'SQL injection patterns detected'
          }
        })

        this.blockIP(this.getClientIP(req), 60 * 60 * 1000) // Block for 1 hour

        return res.status(400).json({
          error: 'Security violation',
          message: 'Request contains potentially malicious SQL patterns.'
        })
      }

      next()
    }
  }

  // CSRF Protection Middleware
  csrfProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.csrfProtection) {
        return next()
      }

      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
      }

      const token = req.headers['x-csrf-token'] as string
      const sessionToken = req.session?.csrfToken

      if (!token || !sessionToken || !timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken))) {
        this.logSecurityEvent({
          type: 'csrf_violation',
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date(),
          severity: 'high',
          details: {
            method: req.method,
            hasToken: !!token,
            hasSessionToken: !!sessionToken
          }
        })

        return res.status(403).json({
          error: 'CSRF violation',
          message: 'Invalid or missing CSRF token.'
        })
      }

      next()
    }
  }

  // Password Security Utilities
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32).toString('hex')
    const hashedPassword = await scryptAsync(password, salt, 64) as Buffer
    return `${salt}:${hashedPassword.toString('hex')}`
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':')
    const hashedBuffer = await scryptAsync(password, salt, 64) as Buffer
    const keyBuffer = Buffer.from(key, 'hex')
    return timingSafeEqual(hashedBuffer, keyBuffer)
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Encryption Utilities
  encrypt(text: string): string {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const algorithm = 'aes-256-gcm'
    const key = createHash('sha256').update(this.config.encryptionKey).digest()
    const iv = randomBytes(16)

    const cipher = require('crypto').createCipher(algorithm, key)
    cipher.setAutoPadding(true)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  decrypt(encryptedText: string): string {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const algorithm = 'aes-256-gcm'
    const key = createHash('sha256').update(this.config.encryptionKey).digest()

    const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = require('crypto').createDecipher(algorithm, key)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // Utility Methods
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      return sanitized
    }

    return obj
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      'unknown'
    ) as string
  }

  private blockIP(ip: string, durationMs: number): void {
    const blockedUntil = new Date(Date.now() + durationMs)
    this.blockedIPs.set(ip, blockedUntil)

    // Clean up expired blocks
    setTimeout(() => {
      this.blockedIPs.delete(ip)
    }, durationMs)
  }

  private logSecurityEvent(event: SecurityEvent): void {
    logger.warn('Security event detected', {
      type: event.type,
      ip: event.ip,
      endpoint: event.endpoint,
      severity: event.severity,
      details: event.details,
      timestamp: event.timestamp
    })

    sentry.addBreadcrumb({
      message: `Security event: ${event.type}`,
      category: 'security',
      level: event.severity === 'critical' ? 'error' : 'warning',
      data: {
        ip: event.ip,
        endpoint: event.endpoint,
        ...event.details
      }
    })

    if (event.severity === 'critical') {
      sentry.captureMessage(`Critical security event: ${event.type}`, 'error', {
        tags: {
          security: 'true',
          severity: event.severity,
          type: event.type
        },
        extra: event
      })
    }
  }

  // Public Methods
  trackFailedAttempt(identifier: string): boolean {
    const now = new Date()
    const attempt = this.failedAttempts.get(identifier)

    if (attempt) {
      if (now.getTime() - attempt.firstAttempt.getTime() > 15 * 60 * 1000) {
        // Reset after 15 minutes
        this.failedAttempts.set(identifier, { count: 1, firstAttempt: now })
      } else {
        attempt.count++
        if (attempt.count >= 5) {
          this.blockIP(identifier, 60 * 60 * 1000) // Block for 1 hour
          this.failedAttempts.delete(identifier)
          return true // Blocked
        }
      }
    } else {
      this.failedAttempts.set(identifier, { count: 1, firstAttempt: now })
    }

    return false // Not blocked
  }

  clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier)
  }

  generateCSRFToken(): string {
    return randomBytes(32).toString('hex')
  }

  // Main Security Middleware Stack
  getSecurityMiddleware() {
    return [
      this.securityHeaders(),
      this.ipBlockingMiddleware(),
      this.rateLimitMiddleware(),
      this.inputSanitizationMiddleware(),
      this.xssProtectionMiddleware(),
      this.sqlInjectionProtectionMiddleware(),
      this.csrfProtectionMiddleware()
    ]
  }
}

export const security = new SecurityManager()

// Export commonly used middleware
export const securityHeaders = () => security.securityHeaders()
export const rateLimit = (options?: any) => security.rateLimitMiddleware(options)
export const authRateLimit = () => security.authRateLimitMiddleware()
export const securityMiddleware = () => security.getSecurityMiddleware()

export default security