'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  device: string
  browser: string
  os: string
  location: string
  ipAddress: string
  current: boolean
  lastActive: string
  createdAt: string
}

interface SessionManagerProps {
  onSessionRevoked?: (sessionId: string) => void
  onAllSessionsRevoked?: () => void
}

export default function SessionManager({ onSessionRevoked, onAllSessionsRevoked }: SessionManagerProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [isRevokingAll, setIsRevokingAll] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header would be added by middleware
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        setError('Failed to load sessions')
      }
    } catch (err) {
      setError('Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    setIsRevoking(sessionId)
    setError('')

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setSessions(prev => prev.filter(session => session.id !== sessionId))
        onSessionRevoked?.(sessionId)

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Session ended', 'The selected session has been terminated.', 'success')
        }
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to revoke session')
      }
    } catch (err) {
      setError('Failed to revoke session')
    } finally {
      setIsRevoking(null)
    }
  }

  const revokeAllOtherSessions = async () => {
    setIsRevokingAll(true)
    setError('')

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setSessions(prev => prev.filter(session => session.current))
        onAllSessionsRevoked?.()

        // Show success toast if available
        if (typeof window !== 'undefined' && 'showToast' in window) {
          ;(window as any).showToast('Sessions ended', 'All other sessions have been terminated.', 'success')
        }
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to revoke sessions')
      }
    } catch (err) {
      setError('Failed to revoke sessions')
    } finally {
      setIsRevokingAll(false)
    }
  }

  const formatLastActive = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 30) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getDeviceIcon = (device: string, browser: string): string => {
    if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone')) {
      return '📱'
    }
    if (device.toLowerCase().includes('tablet') || device.toLowerCase().includes('ipad')) {
      return '📲'
    }
    if (browser.toLowerCase().includes('chrome')) return '🌐'
    if (browser.toLowerCase().includes('firefox')) return '🦊'
    if (browser.toLowerCase().includes('safari')) return '🧭'
    if (browser.toLowerCase().includes('edge')) return '🗂️'
    return '💻'
  }

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-glass-bg rounded w-1/3" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-glass-bg rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-glass-bg rounded w-3/4" />
                <div className="h-3 bg-glass-bg rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-primary text-lg font-semibold">
            Active Sessions
          </h3>
          <p className="text-secondary text-sm">
            Manage devices signed in to your KGiQ account
          </p>
        </div>

        {sessions.length > 1 && (
          <button
            onClick={revokeAllOtherSessions}
            disabled={isRevokingAll}
            className="glass-button-ghost text-sm text-error hover:text-error"
          >
            {isRevokingAll ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Ending...
              </div>
            ) : (
              'End all other sessions'
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card-sm bg-error/5 border-error/20">
          <p className="text-error text-sm flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="glass-card text-center py-8">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-secondary">No active sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="glass-card">
              <div className="flex items-start gap-4">
                {/* Device Icon */}
                <div className="flex-shrink-0 text-2xl mt-1">
                  {getDeviceIcon(session.device, session.browser)}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-primary font-medium text-sm">
                      {session.browser} on {session.os}
                    </h4>
                    {session.current && (
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-secondary text-xs">
                      📍 {session.location}
                    </p>
                    <p className="text-muted text-xs">
                      Last active: {formatLastActive(session.lastActive)}
                    </p>
                    <p className="text-muted text-xs font-mono">
                      IP: {session.ipAddress}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {session.current ? (
                    <div className="text-xs text-muted px-3 py-2">
                      This device
                    </div>
                  ) : (
                    <button
                      onClick={() => revokeSession(session.id)}
                      disabled={isRevoking === session.id}
                      className="glass-button-ghost text-sm text-error hover:text-error px-3 py-1"
                    >
                      {isRevoking === session.id ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Ending...
                        </div>
                      ) : (
                        'End session'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Information */}
      <div className="glass-card-sm bg-info/5 border-info/20">
        <div className="flex items-start gap-3">
          <span className="text-info text-lg flex-shrink-0">🛡️</span>
          <div className="text-xs text-secondary">
            <p className="font-semibold text-info mb-1">Security Tips:</p>
            <ul className="space-y-1">
              <li>• End sessions on devices you no longer use</li>
              <li>• Be cautious of sessions from unfamiliar locations</li>
              <li>• Contact support if you see suspicious activity</li>
              <li>• Sessions automatically expire after 30 days of inactivity</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadSessions}
          disabled={isLoading}
          className="glass-button-ghost text-sm"
        >
          Refresh sessions
        </button>
      </div>
    </div>
  )
}