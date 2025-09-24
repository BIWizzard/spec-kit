import { monitoring } from './monitoring'

export interface CSRFToken {
  token: string
  timestamp: number
  expiresAt: number
}

export interface SecurityConfig {
  csrfEnabled: boolean
  xssProtection: boolean
  inputSanitization: boolean
  sessionTimeout: number
  maxIdleTime: number
}

class FrontendSecurity {
  private config: SecurityConfig
  private csrfToken: CSRFToken | null = null
  private sessionStartTime: number = Date.now()
  private lastActivity: number = Date.now()
  private sessionTimeoutId: NodeJS.Timeout | null = null
  private idleTimeoutId: NodeJS.Timeout | null = null

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      csrfEnabled: process.env.NODE_ENV === 'production',
      xssProtection: true,
      inputSanitization: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxIdleTime: 30 * 60 * 1000, // 30 minutes
      ...config
    }

    if (typeof window !== 'undefined') {
      this.initializeSecurity()
    }
  }

  private initializeSecurity(): void {
    // Track user activity
    this.setupActivityTracking()

    // Setup session management
    this.setupSessionManagement()

    // Setup security event handlers
    this.setupSecurityEventHandlers()

    // Initialize CSRF token
    if (this.config.csrfEnabled) {
      this.initializeCSRFToken()
    }
  }

  private setupActivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity()
      }, true)
    })
  }

  private setupSessionManagement(): void {
    // Session timeout
    this.sessionTimeoutId = setTimeout(() => {
      this.handleSessionTimeout()
    }, this.config.sessionTimeout)

    // Idle timeout
    this.resetIdleTimeout()

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, user might be away
        this.handlePageHidden()
      } else {
        // Page is visible again
        this.handlePageVisible()
      }
    })
  }

  private setupSecurityEventHandlers(): void {
    // Handle context menu (right-click) in production
    if (process.env.NODE_ENV === 'production') {
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        this.trackSecurityEvent('context_menu_blocked', {
          target: (e.target as Element)?.tagName || 'unknown'
        })
      })
    }

    // Handle developer tools detection
    this.setupDevToolsDetection()

    // Handle copy/paste security
    this.setupClipboardSecurity()

    // Handle screenshot/screen recording detection
    this.setupScreenCaptureDetection()
  }

  private setupDevToolsDetection(): void {
    if (process.env.NODE_ENV === 'production') {
      let devtools = false

      const detectDevTools = () => {
        const start = new Date().getTime()
        debugger // This will pause execution if dev tools are open
        const end = new Date().getTime()

        if (end - start > 100 && !devtools) {
          devtools = true
          this.trackSecurityEvent('devtools_detected', {
            detectionMethod: 'debugger_timing',
            timeDelay: end - start
          })
        }
      }

      // Check periodically
      setInterval(detectDevTools, 5000)

      // Also check console size changes
      let consoleHeight = window.outerHeight - window.innerHeight
      let consoleWidth = window.outerWidth - window.innerWidth

      setInterval(() => {
        const heightDiff = window.outerHeight - window.innerHeight
        const widthDiff = window.outerWidth - window.innerWidth

        if (Math.abs(heightDiff - consoleHeight) > 200 || Math.abs(widthDiff - consoleWidth) > 200) {
          if (!devtools) {
            devtools = true
            this.trackSecurityEvent('devtools_detected', {
              detectionMethod: 'window_size_change',
              heightDiff: heightDiff - consoleHeight,
              widthDiff: widthDiff - consoleWidth
            })
          }
        }

        consoleHeight = heightDiff
        consoleWidth = widthDiff
      }, 1000)
    }
  }

  private setupClipboardSecurity(): void {
    // Monitor clipboard operations for sensitive data
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection()?.toString() || ''

      if (this.containsSensitiveData(selection)) {
        this.trackSecurityEvent('sensitive_data_copied', {
          dataType: 'selection',
          length: selection.length
        })

        // Optionally prevent copying sensitive data
        if (this.shouldPreventCopy(selection)) {
          e.preventDefault()
          this.showSecurityWarning('Copying sensitive financial data is not allowed.')
        }
      }
    })

    document.addEventListener('cut', (e) => {
      const selection = window.getSelection()?.toString() || ''

      if (this.containsSensitiveData(selection)) {
        this.trackSecurityEvent('sensitive_data_cut', {
          dataType: 'selection',
          length: selection.length
        })

        e.preventDefault()
        this.showSecurityWarning('Cutting sensitive financial data is not allowed.')
      }
    })
  }

  private setupScreenCaptureDetection(): void {
    // Detect screen sharing/recording
    if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia

      navigator.mediaDevices.getDisplayMedia = function(...args) {
        this.trackSecurityEvent('screen_capture_detected', {
          method: 'getDisplayMedia',
          userAgent: navigator.userAgent
        })

        return originalGetDisplayMedia.apply(this, args)
      }.bind(this)
    }
  }

  private initializeCSRFToken(): void {
    // Get CSRF token from meta tag or API
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

    if (metaToken) {
      this.csrfToken = {
        token: metaToken,
        timestamp: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
      }
    } else {
      this.fetchCSRFToken()
    }
  }

  private async fetchCSRFToken(): Promise<void> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'same-origin'
      })

      if (response.ok) {
        const data = await response.json()
        this.csrfToken = {
          token: data.token,
          timestamp: Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000)
        }
      }
    } catch (error) {
      this.trackSecurityEvent('csrf_token_fetch_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private updateLastActivity(): void {
    this.lastActivity = Date.now()
    this.resetIdleTimeout()
  }

  private resetIdleTimeout(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId)
    }

    this.idleTimeoutId = setTimeout(() => {
      this.handleIdleTimeout()
    }, this.config.maxIdleTime)
  }

  private handleSessionTimeout(): void {
    this.trackSecurityEvent('session_timeout', {
      sessionDuration: Date.now() - this.sessionStartTime,
      lastActivity: this.lastActivity
    })

    this.showSecurityWarning('Your session has expired for security reasons. Please log in again.')
    this.logout()
  }

  private handleIdleTimeout(): void {
    const idleTime = Date.now() - this.lastActivity

    this.trackSecurityEvent('idle_timeout', {
      idleTime,
      sessionDuration: Date.now() - this.sessionStartTime
    })

    this.showSecurityWarning('You have been logged out due to inactivity.')
    this.logout()
  }

  private handlePageHidden(): void {
    // Start a shorter timeout when page is hidden
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId)
    }

    this.idleTimeoutId = setTimeout(() => {
      this.handleIdleTimeout()
    }, 5 * 60 * 1000) // 5 minutes when hidden
  }

  private handlePageVisible(): void {
    // Reset to normal timeout when page becomes visible
    this.resetIdleTimeout()
  }

  private containsSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\$[\d,]+\.?\d{0,2}/, // Currency amounts
      /password/i,
      /secret/i,
      /token/i,
      /key/i
    ]

    return sensitivePatterns.some(pattern => pattern.test(text))
  }

  private shouldPreventCopy(text: string): boolean {
    // Only prevent copying of financial data patterns
    const financialPatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{9,12}\b/ // Account numbers
    ]

    return financialPatterns.some(pattern => pattern.test(text))
  }

  private showSecurityWarning(message: string): void {
    // You can customize this to use your app's notification system
    if (typeof window !== 'undefined') {
      alert(message) // Replace with proper notification
    }
  }

  private trackSecurityEvent(event: string, details?: Record<string, any>): void {
    monitoring.trackEvent({
      name: 'security_event',
      properties: {
        event_type: event,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...details
      }
    })
  }

  private logout(): void {
    // Clear session data
    this.csrfToken = null

    // Clear local storage (be careful with this)
    if (typeof window !== 'undefined') {
      // Only clear app-specific items, not all localStorage
      const keysToRemove = ['authToken', 'refreshToken', 'userSession']
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  // Public API

  sanitizeInput(input: string): string {
    if (!this.config.inputSanitization) {
      return input
    }

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;')
      .trim()
  }

  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = {} as T

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeInput(value) as T[keyof T]
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value)
      } else {
        sanitized[key as keyof T] = value
      }
    }

    return sanitized
  }

  getCSRFToken(): string | null {
    if (!this.config.csrfEnabled || !this.csrfToken) {
      return null
    }

    // Check if token is expired
    if (Date.now() > this.csrfToken.expiresAt) {
      this.fetchCSRFToken()
      return null
    }

    return this.csrfToken.token
  }

  addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
    const token = this.getCSRFToken()

    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token
      }
    }

    return headers
  }

  secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const secureOptions: RequestInit = {
      ...options,
      credentials: 'same-origin',
      headers: this.addCSRFHeader(options.headers)
    }

    return fetch(url, secureOptions)
      .then(response => {
        if (!response.ok) {
          this.trackSecurityEvent('api_request_failed', {
            url,
            status: response.status,
            statusText: response.statusText
          })
        }
        return response
      })
      .catch(error => {
        this.trackSecurityEvent('api_request_error', {
          url,
          error: error.message
        })
        throw error
      })
  }

  validateSession(): boolean {
    const sessionDuration = Date.now() - this.sessionStartTime
    const idleTime = Date.now() - this.lastActivity

    if (sessionDuration > this.config.sessionTimeout) {
      this.handleSessionTimeout()
      return false
    }

    if (idleTime > this.config.maxIdleTime) {
      this.handleIdleTimeout()
      return false
    }

    return true
  }

  extendSession(): void {
    this.sessionStartTime = Date.now()
    this.updateLastActivity()

    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId)
    }

    this.sessionTimeoutId = setTimeout(() => {
      this.handleSessionTimeout()
    }, this.config.sessionTimeout)
  }

  destroy(): void {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId)
    }
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId)
    }
  }
}

export const frontendSecurity = new FrontendSecurity()

// React hooks
export function useSecurity() {
  return {
    sanitizeInput: frontendSecurity.sanitizeInput.bind(frontendSecurity),
    sanitizeObject: frontendSecurity.sanitizeObject.bind(frontendSecurity),
    getCSRFToken: frontendSecurity.getCSRFToken.bind(frontendSecurity),
    secureRequest: frontendSecurity.secureRequest.bind(frontendSecurity),
    validateSession: frontendSecurity.validateSession.bind(frontendSecurity),
    extendSession: frontendSecurity.extendSession.bind(frontendSecurity)
  }
}

// Higher-order component for secure forms
export function withSecureForm<P extends object>(WrappedComponent: React.ComponentType<P>) {
  const SecureFormComponent = (props: P) => {
    React.useEffect(() => {
      // Validate session when component mounts
      frontendSecurity.validateSession()
    }, [])

    return <WrappedComponent {...props} />
  }

  SecureFormComponent.displayName = `withSecureForm(${WrappedComponent.displayName || WrappedComponent.name})`

  return SecureFormComponent
}

export default frontendSecurity