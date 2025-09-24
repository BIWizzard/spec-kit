'use client'

import { Component, ReactNode, ErrorInfo } from 'react'
import Image from 'next/image'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId

    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error (${errorId})`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.groupEnd()
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo, errorId)

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: { errorInfo, errorId }
      // })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    })
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state

    // Create error report
    const errorReport = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please share with support team.')
    }).catch(() => {
      console.log('Error Report:', errorReport)
      alert('Error details logged to console. Please check browser console and share with support team.')
    })
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI with KGiQ branding
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full text-center">
            {/* KGiQ Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16 opacity-75">
                <Image
                  src="/assets/branding/KGiQ_logo_transparent.svg"
                  alt="KGiQ"
                  width={64}
                  height={64}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Error Icon and Title */}
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-error text-2xl font-bold mb-2">
                Something went wrong
              </h1>
              <p className="text-secondary text-lg">
                KGiQ encountered an unexpected error
              </p>
            </div>

            {/* Error Details */}
            <div className="glass-card-sm bg-error/10 border-error/20 mb-6 text-left">
              <h3 className="text-error font-semibold mb-2 flex items-center gap-2">
                <span>🔍</span>
                Error Details
              </h3>

              <div className="text-sm space-y-2">
                <div>
                  <span className="text-muted">Error ID:</span>{' '}
                  <code className="text-accent font-mono text-xs">
                    {this.state.errorId}
                  </code>
                </div>

                {this.state.error && (
                  <div>
                    <span className="text-muted">Message:</span>{' '}
                    <span className="text-primary">
                      {this.state.error.message}
                    </span>
                  </div>
                )}

                <div className="text-muted text-xs">
                  This error has been logged for investigation.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="glass-button-primary px-6 py-3"
              >
                <span className="mr-2">🔄</span>
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="glass-button-ghost px-6 py-3"
              >
                <span className="mr-2">♻️</span>
                Reload Page
              </button>

              <button
                onClick={this.handleReportError}
                className="glass-button-ghost px-6 py-3 text-muted"
              >
                <span className="mr-2">📋</span>
                Copy Error Details
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-glass-border">
              <p className="text-muted text-sm">
                If this error persists, please contact{' '}
                <a href="mailto:support@kgiq.dev" className="text-accent hover:underline">
                  KGiQ Support
                </a>
                {' '}with the error ID above.
              </p>
            </div>

            {/* Development Mode Stack Trace */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-warning cursor-pointer font-semibold mb-2">
                  🛠️ Development Details (Click to expand)
                </summary>
                <div className="glass-card-sm bg-warning/5 border-warning/20">
                  <h4 className="text-warning font-semibold mb-2">Stack Trace:</h4>
                  <pre className="text-xs text-secondary overflow-auto whitespace-pre-wrap font-mono">
                    {this.state.error.stack}
                  </pre>

                  {this.state.errorInfo && (
                    <>
                      <h4 className="text-warning font-semibold mb-2 mt-4">Component Stack:</h4>
                      <pre className="text-xs text-secondary overflow-auto whitespace-pre-wrap font-mono">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Hook for functional component error handling
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('Error caught by useErrorHandler:', error)

    // You can throw the error to bubble it up to the nearest error boundary
    throw error
  }
}