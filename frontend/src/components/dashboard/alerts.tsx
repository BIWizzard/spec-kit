'use client'

import { useState } from 'react'

interface Alert {
  id: string
  type: 'budget_warning' | 'overdue_payment' | 'low_balance' | 'bank_sync_error' | 'goal_milestone' | 'security'
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  timestamp: string
  read: boolean
  dismissible: boolean
  actionRequired: boolean
  actions?: {
    primary?: {
      label: string
      url?: string
      onClick?: () => void
    }
    secondary?: {
      label: string
      url?: string
      onClick?: () => void
    }
  }
  data?: {
    amount?: number
    percentage?: number
    daysOverdue?: number
    accountName?: string
  }
}

interface AlertTypeConfig {
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

const alertTypeConfig: Record<Alert['type'], AlertTypeConfig> = {
  budget_warning: {
    icon: '⚠️',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-l-warning'
  },
  overdue_payment: {
    icon: '🚨',
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-l-error'
  },
  low_balance: {
    icon: '💳',
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-l-error'
  },
  bank_sync_error: {
    icon: '🔄',
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-l-error'
  },
  goal_milestone: {
    icon: '🎉',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-l-success'
  },
  security: {
    icon: '🔒',
    color: 'text-kgiq-primary',
    bgColor: 'bg-kgiq-primary/10',
    borderColor: 'border-l-kgiq-primary'
  }
}

const severityConfig = {
  critical: {
    color: 'text-error',
    bg: 'bg-error/20',
    label: 'Critical',
    pulse: 'animate-pulse'
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/20',
    label: 'Warning',
    pulse: ''
  },
  info: {
    color: 'text-info',
    bg: 'bg-info/20',
    label: 'Info',
    pulse: ''
  },
  success: {
    color: 'text-success',
    bg: 'bg-success/20',
    label: 'Success',
    pulse: ''
  }
}

function AlertCard({ alert, onDismiss, onMarkRead }: {
  alert: Alert
  onDismiss?: (id: string) => void
  onMarkRead?: (id: string) => void
}) {
  const typeConfig = alertTypeConfig[alert.type]
  const severityInfo = severityConfig[alert.severity]

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss?.(alert.id)
  }

  const handleMarkRead = () => {
    if (!alert.read) {
      onMarkRead?.(alert.id)
    }
  }

  return (
    <div
      className={`glass-card p-4 ${typeConfig.borderColor} border-l-4 hover:bg-glass-bg-light transition-all duration-200 group cursor-pointer ${
        !alert.read ? 'shadow-glass-hover' : ''
      } ${severityInfo.pulse}`}
      onClick={handleMarkRead}
    >
      <div className="flex items-start gap-3">
        {/* Alert Icon */}
        <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-lg">{typeConfig.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold text-sm ${!alert.read ? 'text-primary' : 'text-secondary'}`}>
                  {alert.title}
                </h3>

                {!alert.read && (
                  <div className="w-2 h-2 rounded-full bg-kgiq-primary animate-pulse"></div>
                )}

                {alert.severity === 'critical' && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityInfo.bg} ${severityInfo.color}`}>
                    {severityInfo.label}
                  </span>
                )}
              </div>

              <p className={`text-xs leading-relaxed mb-2 ${!alert.read ? 'text-primary' : 'text-muted'}`}>
                {alert.message}
              </p>

              {/* Additional Data */}
              {alert.data && (
                <div className="flex items-center gap-3 text-xs text-muted mb-3">
                  {alert.data.amount !== undefined && (
                    <span className="flex items-center gap-1">
                      💰 ${alert.data.amount.toLocaleString()}
                    </span>
                  )}
                  {alert.data.percentage !== undefined && (
                    <span className="flex items-center gap-1">
                      📊 {alert.data.percentage}%
                    </span>
                  )}
                  {alert.data.daysOverdue !== undefined && (
                    <span className="flex items-center gap-1 text-error">
                      ⏰ {alert.data.daysOverdue} days overdue
                    </span>
                  )}
                  {alert.data.accountName && (
                    <span className="flex items-center gap-1">
                      🏦 {alert.data.accountName}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {alert.actions && (
                <div className="flex items-center gap-2 mt-3">
                  {alert.actions.primary && (
                    <button
                      className="glass-button-primary text-xs px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        alert.actions?.primary?.onClick?.()
                      }}
                    >
                      {alert.actions.primary.label}
                    </button>
                  )}
                  {alert.actions.secondary && (
                    <button
                      className="glass-button-ghost text-xs px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        alert.actions?.secondary?.onClick?.()
                      }}
                    >
                      {alert.actions.secondary.label}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Timestamp and Actions */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted">
                {formatTimestamp(alert.timestamp)}
              </span>

              {alert.dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-muted hover:text-error transition-colors duration-200 text-sm"
                  title="Dismiss alert"
                >
                  ✕
                </button>
              )}

              {alert.actionRequired && (
                <span className="text-xs text-error bg-error/10 px-2 py-1 rounded-full font-medium">
                  Action Required
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlertFilter({
  currentFilter,
  onFilterChange
}: {
  currentFilter: string
  onFilterChange: (filter: string) => void
}) {
  const filters = [
    { value: 'all', label: 'All', icon: '🔔' },
    { value: 'unread', label: 'Unread', icon: '🔥' },
    { value: 'critical', label: 'Critical', icon: '🚨' },
    { value: 'action_required', label: 'Action Required', icon: '⚡' }
  ]

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
            currentFilter === filter.value
              ? 'bg-kgiq-primary text-bg-primary shadow-md'
              : 'bg-glass-bg text-muted hover:text-primary hover:bg-glass-bg-light'
          }`}
        >
          <span>{filter.icon}</span>
          {filter.label}
        </button>
      ))}
    </div>
  )
}

export default function AlertNotifications() {
  const [filter, setFilter] = useState('unread')
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'overdue_payment',
      title: 'Payment Overdue',
      message: 'Your credit card payment of $250 was due 2 days ago. Please make a payment to avoid late fees.',
      severity: 'critical',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      dismissible: false,
      actionRequired: true,
      actions: {
        primary: { label: 'Pay Now', url: '/payments/create' },
        secondary: { label: 'View Details', url: '/payments/123' }
      },
      data: {
        amount: 250,
        daysOverdue: 2
      }
    },
    {
      id: '2',
      type: 'budget_warning',
      title: 'Budget Alert: Dining',
      message: 'You\'ve spent 85% of your dining budget with 12 days remaining this month.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: false,
      dismissible: true,
      actionRequired: false,
      actions: {
        primary: { label: 'Adjust Budget', url: '/budget/categories' },
        secondary: { label: 'View Spending', url: '/transactions' }
      },
      data: {
        amount: 425,
        percentage: 85
      }
    },
    {
      id: '3',
      type: 'low_balance',
      title: 'Low Balance Warning',
      message: 'Your checking account balance is below $500. Consider transferring funds to avoid overdraft fees.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      read: false,
      dismissible: true,
      actionRequired: true,
      actions: {
        primary: { label: 'Transfer Funds', url: '/bank-accounts' },
        secondary: { label: 'View Account', url: '/bank-accounts/123' }
      },
      data: {
        amount: 385,
        accountName: 'Chase Checking'
      }
    },
    {
      id: '4',
      type: 'goal_milestone',
      title: 'Savings Goal Achieved!',
      message: 'Congratulations! You\'ve reached your emergency fund goal of $10,000.',
      severity: 'success',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      read: true,
      dismissible: true,
      actionRequired: false,
      actions: {
        primary: { label: 'Set New Goal', url: '/budget/goals' }
      },
      data: {
        amount: 10000,
        percentage: 100
      }
    },
    {
      id: '5',
      type: 'bank_sync_error',
      title: 'Bank Sync Failed',
      message: 'Unable to sync transactions from Wells Fargo Savings. Please reconnect your account.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      read: true,
      dismissible: true,
      actionRequired: true,
      actions: {
        primary: { label: 'Reconnect', url: '/bank-accounts/reconnect/456' },
        secondary: { label: 'View Details', url: '/bank-accounts/456' }
      },
      data: {
        accountName: 'Wells Fargo Savings'
      }
    }
  ])

  const handleDismiss = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId))
  }

  const handleMarkRead = (alertId: string) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId ? { ...alert, read: true } : alert
    ))
  }

  const handleMarkAllRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })))
  }

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unread':
        return !alert.read
      case 'critical':
        return alert.severity === 'critical'
      case 'action_required':
        return alert.actionRequired
      default:
        return true
    }
  })

  // Summary stats
  const unreadCount = alerts.filter(a => !a.read).length
  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const actionRequiredCount = alerts.filter(a => a.actionRequired).length

  // Only show component if there are alerts
  if (alerts.length === 0) {
    return null
  }

  return (
    <section className="glass-card p-6 border-kgiq-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            🔔 Alert Center
          </h2>
          <p className="text-sm text-muted mt-1">Important notifications requiring attention</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="glass-button-ghost text-sm px-3 py-2"
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {(unreadCount > 0 || criticalCount > 0 || actionRequiredCount > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 glass-card bg-kgiq-primary/5">
            <p className="text-lg font-bold text-kgiq-primary">{unreadCount}</p>
            <p className="text-xs text-muted">Unread</p>
          </div>
          <div className="text-center p-3 glass-card bg-error/5">
            <p className="text-lg font-bold text-error">{criticalCount}</p>
            <p className="text-xs text-muted">Critical</p>
          </div>
          <div className="text-center p-3 glass-card bg-warning/5">
            <p className="text-lg font-bold text-warning">{actionRequiredCount}</p>
            <p className="text-xs text-muted">Action Needed</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <AlertFilter currentFilter={filter} onFilterChange={setFilter} />

      {/* Alerts List */}
      <div className="space-y-3 mt-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <div className="text-4xl mb-2">✅</div>
            <p>No {filter !== 'all' ? filter : ''} alerts</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </div>

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-center mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">🛡️</span>
          <span>Smart alerts powered by KGiQ monitoring</span>
        </div>
      </div>
    </section>
  )
}