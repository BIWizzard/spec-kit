'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 text-center mb-6">
          We apologize for the inconvenience. An unexpected error occurred.
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Reload Page
          </button>

          <button
            onClick={() => Sentry.showReportDialog()}
            className="w-full px-4 py-2 text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Report This Issue
          </button>
        </div>

        {isDevelopment && error && (
          <details className="mt-6 p-4 bg-gray-100 rounded-md">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
              Error Details (Development Only)
            </summary>
            <div className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
              <div className="mb-2">
                <strong>Message:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  {error.stack}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true)
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      })
      scope.setLevel('error')
      Sentry.captureException(error)
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Error info:', errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

// Hook for using error boundary programmatically
export function useErrorHandler() {
  return (error: Error, errorInfo?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      if (errorInfo) {
        scope.setContext('errorInfo', errorInfo)
      }
      scope.setLevel('error')
      Sentry.captureException(error)
    })

    if (process.env.NODE_ENV === 'development') {
      console.error('Manual error capture:', error)
      if (errorInfo) {
        console.error('Error info:', errorInfo)
      }
    }
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary