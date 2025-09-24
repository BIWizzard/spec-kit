import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  requestId?: string
  userId?: string
  sessionId?: string
  component?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface LoggerConfig {
  level: LogLevel
  format: 'json' | 'text'
  output: {
    console: boolean
    file: boolean
    vercel: boolean
  }
  file?: {
    path: string
    maxSize: number
    maxFiles: number
  }
  redactKeys?: string[]
}

class Logger {
  private config: LoggerConfig
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  }
  private fileStream?: NodeJS.WritableStream

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
      output: {
        console: process.env.LOG_CONSOLE !== 'false',
        file: process.env.LOG_FILE === 'true',
        vercel: process.env.VERCEL === '1',
      },
      file: {
        path: process.env.LOG_FILE_PATH || './logs',
        maxSize: parseInt(process.env.LOG_MAX_SIZE || '50000000'), // 50MB
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      },
      redactKeys: ['password', 'token', 'secret', 'key', 'auth', 'authorization'],
      ...config,
    }

    this.initializeFileLogging()
  }

  private initializeFileLogging(): void {
    if (!this.config.output.file || !this.config.file) {
      return
    }

    try {
      if (!existsSync(this.config.file.path)) {
        mkdirSync(this.config.file.path, { recursive: true })
      }

      const logFile = join(this.config.file.path, 'app.log')
      this.fileStream = createWriteStream(logFile, { flags: 'a' })
    } catch (error) {
      console.error('Failed to initialize file logging:', error)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level]
  }

  private redactSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const redacted = Array.isArray(obj) ? [...obj] : { ...obj }

    for (const key in redacted) {
      if (this.config.redactKeys?.some(redactKey =>
        key.toLowerCase().includes(redactKey.toLowerCase())
      )) {
        redacted[key] = '[REDACTED]'
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key])
      }
    }

    return redacted
  }

  private formatLogEntry(entry: LogEntry): string {
    const redactedEntry = {
      ...entry,
      metadata: entry.metadata ? this.redactSensitiveData(entry.metadata) : undefined,
    }

    if (this.config.format === 'json') {
      return JSON.stringify(redactedEntry)
    }

    let formatted = `[${entry.timestamp}] ${entry.level.toUpperCase()}`

    if (entry.requestId) {
      formatted += ` [${entry.requestId}]`
    }

    if (entry.component) {
      formatted += ` [${entry.component}]`
    }

    formatted += `: ${entry.message}`

    if (entry.metadata) {
      formatted += ` ${JSON.stringify(redactedEntry.metadata)}`
    }

    if (entry.error) {
      formatted += `\nError: ${entry.error.message}`
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`
      }
    }

    return formatted
  }

  private writeLog(entry: LogEntry): void {
    const formattedLog = this.formatLogEntry(entry)

    if (this.config.output.console) {
      const method = entry.level === 'error' || entry.level === 'fatal' ? 'error' :
                   entry.level === 'warn' ? 'warn' : 'log'
      console[method](formattedLog)
    }

    if (this.config.output.file && this.fileStream) {
      this.fileStream.write(formattedLog + '\n')
    }

    if (this.config.output.vercel) {
      // Vercel automatically captures console logs
      console.log(formattedLog)
    }
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    }

    this.writeLog(entry)
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, metadata, error)
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('fatal', message, metadata, error)
  }

  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config)

    const originalWriteLog = childLogger.writeLog.bind(childLogger)
    childLogger.writeLog = (entry: LogEntry) => {
      originalWriteLog({
        ...entry,
        metadata: { ...context, ...entry.metadata },
      })
    }

    return childLogger
  }

  withRequestId(requestId: string): Logger {
    return this.child({ requestId })
  }

  withUserId(userId: string): Logger {
    return this.child({ userId })
  }

  withComponent(component: string): Logger {
    return this.child({ component })
  }

  timer(name: string, metadata?: Record<string, any>): () => void {
    const start = Date.now()

    return () => {
      const duration = Date.now() - start
      this.info(`Timer: ${name}`, {
        duration_ms: duration,
        ...metadata
      })
    }
  }

  logAPICall(
    method: string,
    path: string,
    status: number,
    duration: number,
    requestId?: string,
    userId?: string,
    error?: Error
  ): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

    this.log(
      level,
      `API ${method} ${path} - ${status}`,
      {
        method,
        path,
        status,
        duration_ms: duration,
        requestId,
        userId,
        success: status >= 200 && status < 300,
      },
      error
    )
  }

  logDatabaseQuery(
    query: string,
    duration: number,
    rowCount?: number,
    error?: Error
  ): void {
    const level = error ? 'error' : duration > 1000 ? 'warn' : 'debug'

    this.log(
      level,
      `Database query executed`,
      {
        query: query.slice(0, 200), // Truncate long queries
        duration_ms: duration,
        row_count: rowCount,
      },
      error
    )
  }

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): void {
    const level = severity === 'critical' ? 'fatal' :
                 severity === 'high' ? 'error' :
                 severity === 'medium' ? 'warn' : 'info'

    this.log(level, `Security event: ${event}`, {
      security_event: event,
      severity,
      ...metadata,
    })
  }

  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.fileStream && 'flush' in this.fileStream) {
        (this.fileStream as any).flush(resolve)
      } else {
        resolve()
      }
    })
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.fileStream) {
        this.fileStream.end(resolve)
      } else {
        resolve()
      }
    })
  }
}

export const logger = new Logger()

export const createRequestLogger = (requestId: string) =>
  logger.withRequestId(requestId)

export const createUserLogger = (userId: string) =>
  logger.withUserId(userId)

export const createComponentLogger = (component: string) =>
  logger.withComponent(component)

export default logger