'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface Toast {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toastData: Omit<Toast, 'id'>): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = {
      id,
      duration: 5000, // 5 seconds default
      ...toastData,
    }

    setToasts(prev => [...prev, toast])

    // Auto-remove toast after duration (unless persistent)
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast Container Component
function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

// Individual Toast Component
function ToastComponent({
  toast,
  onRemove
}: {
  toast: Toast
  onRemove: () => void
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  // Animation control
  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(showTimer)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(onRemove, 200) // Wait for exit animation
  }

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return 'border-success/30 bg-success/5 text-success'
      case 'error':
        return 'border-error/30 bg-error/5 text-error'
      case 'warning':
        return 'border-warning/30 bg-warning/5 text-warning'
      case 'info':
        return 'border-info/30 bg-info/5 text-info'
      default:
        return 'border-glass-border bg-glass-bg text-primary'
    }
  }

  return (
    <div
      className={`
        glass-card p-4 pointer-events-auto shadow-lg transition-all duration-300 transform
        ${getToastColors()}
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isRemoving ? 'scale-95' : 'scale-100'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-lg mt-0.5">
          {getToastIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-5">
            {toast.title}
          </h4>

          {toast.message && (
            <p className="text-xs text-secondary mt-1 leading-4">
              {toast.message}
            </p>
          )}

          {/* Action Button */}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-xs text-accent hover:text-primary font-medium mt-2 underline transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-muted hover:text-primary transition-colors p-1 -m-1"
          aria-label="Close notification"
        >
          <span className="text-sm">×</span>
        </button>
      </div>

      {/* Progress Bar for timed toasts */}
      {!toast.persistent && toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-glass-border rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-current opacity-30 rounded-b-lg"
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  )
}

// Hook to use toast functionality
export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}

// Convenience functions for different toast types
export function useToastHelpers() {
  const { addToast } = useToast()

  return {
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ title, message, type: 'success', ...options }),

    error: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ title, message, type: 'error', duration: 8000, ...options }),

    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ title, message, type: 'warning', duration: 6000, ...options }),

    info: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ title, message, type: 'info', ...options }),

    // Special toasts for financial app
    paymentSuccess: (amount: string, payee: string) =>
      addToast({
        title: 'Payment Recorded',
        message: `$${amount} payment to ${payee} has been saved.`,
        type: 'success',
      }),

    incomeAdded: (amount: string, source: string) =>
      addToast({
        title: 'Income Event Added',
        message: `$${amount} from ${source} has been scheduled.`,
        type: 'success',
      }),

    bankSyncComplete: (accountName: string, transactionCount: number) =>
      addToast({
        title: 'Bank Sync Complete',
        message: `${transactionCount} new transactions from ${accountName}.`,
        type: 'info',
        action: {
          label: 'View Transactions',
          onClick: () => window.location.href = '/transactions'
        }
      }),

    budgetWarning: (category: string, percentage: number) =>
      addToast({
        title: 'Budget Alert',
        message: `${category} is at ${percentage}% of monthly limit.`,
        type: 'warning',
        persistent: true,
        action: {
          label: 'Review Budget',
          onClick: () => window.location.href = '/budget'
        }
      }),
  }
}

// CSS for progress bar animation (add to globals.css)
export const toastStyles = `
@keyframes toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}
`

// Example usage component (for testing)
export function ToastDemo() {
  const helpers = useToastHelpers()

  return (
    <div className="glass-card space-y-4">
      <h3 className="text-primary font-semibold">Toast Notifications Demo</h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => helpers.success('Success!', 'Your action was completed successfully.')}
          className="glass-button-success"
        >
          Success Toast
        </button>

        <button
          onClick={() => helpers.error('Error!', 'Something went wrong. Please try again.')}
          className="glass-button glass-button-ghost text-error"
        >
          Error Toast
        </button>

        <button
          onClick={() => helpers.warning('Warning!', 'Please review this important information.')}
          className="glass-button glass-button-ghost text-warning"
        >
          Warning Toast
        </button>

        <button
          onClick={() => helpers.info('Info', 'Here is some useful information for you.')}
          className="glass-button-ghost"
        >
          Info Toast
        </button>

        <button
          onClick={() => helpers.paymentSuccess('1,250.00', 'ABC Property Management')}
          className="glass-button-primary"
        >
          Payment Success
        </button>

        <button
          onClick={() => helpers.bankSyncComplete('Chase Checking', 15)}
          className="glass-button-ghost"
        >
          Bank Sync
        </button>
      </div>
    </div>
  )
}

export default {
  Provider: ToastProvider,
  useToast,
  useToastHelpers,
  Demo: ToastDemo,
  styles: toastStyles,
}