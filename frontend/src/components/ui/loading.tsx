import Image from 'next/image'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

interface LoadingPageProps {
  message?: string
  submessage?: string
}

interface LoadingSkeletonProps {
  className?: string
  lines?: number
  avatar?: boolean
}

interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
}

// Main Loading Spinner Component
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-glass-border animate-spin">
        <div className="absolute top-0 right-0 w-1 h-1 bg-kgiq-primary rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )
}

// Full Page Loading Component
export function LoadingPage({
  message = 'Loading your financial data...',
  submessage = 'Powered by KGiQ Intelligence'
}: LoadingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full text-center">
        {/* KGiQ Logo with Pulse Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 logo-loading">
            <Image
              src="/assets/branding/KGiQ_logo_transparent.svg"
              alt="KGiQ"
              width={64}
              height={64}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <LoadingSpinner size="lg" />
        </div>

        {/* Loading Messages */}
        <div className="space-y-2">
          <h2 className="text-primary text-lg font-semibold">{message}</h2>
          <p className="text-secondary text-sm">{submessage}</p>
        </div>

        {/* Loading Progress Indicator */}
        <div className="mt-6">
          <div className="w-full bg-glass-bg rounded-full h-2">
            <div className="bg-gradient-to-r from-kgiq-secondary to-kgiq-primary h-2 rounded-full animate-pulse"
                 style={{ width: '70%' }} />
          </div>
          <p className="text-muted text-xs mt-2">Synchronizing with secure servers</p>
        </div>
      </div>
    </div>
  )
}

// Loading Skeleton Component
export function LoadingSkeleton({
  className = '',
  lines = 3,
  avatar = false
}: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="glass-skeleton">
        {avatar && (
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-10 h-10 bg-glass-bg rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-glass-bg rounded w-24" />
              <div className="h-3 bg-glass-bg rounded w-32" />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className="h-4 bg-glass-bg rounded"
              style={{
                width: `${Math.random() * 40 + 60}%`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Loading Overlay Component
export function LoadingOverlay({ isVisible, message = 'Processing...' }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="glass-modal-overlay active">
      <div className="glass-card text-center max-w-sm w-full mx-4">
        <div className="flex justify-center mb-4">
          <LoadingSpinner size="lg" />
        </div>
        <p className="text-primary font-medium">{message}</p>
        <p className="text-secondary text-sm mt-2">Please wait...</p>
      </div>
    </div>
  )
}

// Card Loading State
export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card ${className}`}>
      <LoadingSkeleton lines={4} />
    </div>
  )
}

// Button Loading State
export function LoadingButton({
  children,
  loading = false,
  className = '',
  onClick,
  disabled
}: {
  children: React.ReactNode
  loading?: boolean
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`glass-button-primary flex items-center gap-2 ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}

// Chart Loading State
export function LoadingChart({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-glass-bg rounded w-1/3 mb-4" />
        <div className="h-48 bg-glass-bg rounded mb-4" />
        <div className="flex justify-between">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-4 bg-glass-bg rounded w-16" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Table Loading State
export function LoadingTable({
  rows = 5,
  columns = 4,
  className = ''
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={`glass-card ${className}`}>
      <div className="animate-pulse space-y-4">
        {/* Table Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="h-4 bg-glass-bg rounded w-24" />
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, j) => (
              <div
                key={j}
                className="h-4 bg-glass-bg rounded"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Export all components as default
export default {
  Spinner: LoadingSpinner,
  Page: LoadingPage,
  Skeleton: LoadingSkeleton,
  Overlay: LoadingOverlay,
  Card: LoadingCard,
  Button: LoadingButton,
  Chart: LoadingChart,
  Table: LoadingTable,
}