'use client'

import { useState } from 'react'

interface ActivityItem {
  id: string
  type: 'transaction' | 'payment' | 'income' | 'budget' | 'bank_sync' | 'family'
  title: string
  description: string
  amount?: number
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  category?: string
  familyMember?: string
}

interface ActivityTypeConfig {
  icon: string
  color: string
  bgColor: string
  label: string
}

const activityTypeConfig: Record<ActivityItem['type'], ActivityTypeConfig> = {
  transaction: {
    icon: '💳',
    color: 'text-kgiq-tertiary',
    bgColor: 'bg-kgiq-tertiary/10',
    label: 'Transaction'
  },
  payment: {
    icon: '💸',
    color: 'text-error',
    bgColor: 'bg-error/10',
    label: 'Payment'
  },
  income: {
    icon: '💵',
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Income'
  },
  budget: {
    icon: '🎯',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Budget'
  },
  bank_sync: {
    icon: '🔄',
    color: 'text-kgiq-primary',
    bgColor: 'bg-kgiq-primary/10',
    label: 'Bank Sync'
  },
  family: {
    icon: '👨‍👩‍👧‍👦',
    color: 'text-kgiq-secondary',
    bgColor: 'bg-kgiq-secondary/10',
    label: 'Family'
  }
}

const statusConfig = {
  completed: { icon: '✅', color: 'text-success' },
  pending: { icon: '⏳', color: 'text-warning' },
  failed: { icon: '❌', color: 'text-error' }
}

function ActivityItem({ activity }: { activity: ActivityItem }) {
  const typeConfig = activityTypeConfig[activity.type]
  const statusInfo = statusConfig[activity.status]

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount))
  }

  return (
    <div className="glass-card p-4 hover:bg-glass-bg-light transition-all duration-200 group cursor-pointer">
      <div className="flex items-start gap-3">
        {/* Activity Type Icon */}
        <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-lg">{typeConfig.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-primary font-medium text-sm truncate">
                {activity.title}
              </h3>
              <p className="text-muted text-xs mt-1 line-clamp-2">
                {activity.description}
              </p>

              {/* Additional Info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <span className={typeConfig.color}>{typeConfig.icon}</span>
                  {typeConfig.label}
                </span>

                {activity.category && (
                  <span className="flex items-center gap-1">
                    <span>🏷️</span>
                    {activity.category}
                  </span>
                )}

                {activity.familyMember && (
                  <span className="flex items-center gap-1">
                    <span>👤</span>
                    {activity.familyMember}
                  </span>
                )}
              </div>
            </div>

            {/* Amount and Status */}
            <div className="flex flex-col items-end gap-2">
              {activity.amount !== undefined && (
                <span className={`text-sm font-semibold ${
                  activity.amount > 0 ? 'text-success' : 'text-error'
                }`}>
                  {activity.amount > 0 ? '+' : '-'}{formatAmount(activity.amount)}
                </span>
              )}

              <div className="flex items-center gap-2">
                <span className={`text-xs ${statusInfo.color}`}>
                  {statusInfo.icon}
                </span>
                <span className="text-xs text-muted">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityFilter({
  currentFilter,
  onFilterChange
}: {
  currentFilter: string
  onFilterChange: (filter: string) => void
}) {
  const filters = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'transaction', label: 'Transactions', icon: '💳' },
    { value: 'payment', label: 'Payments', icon: '💸' },
    { value: 'income', label: 'Income', icon: '💵' },
    { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' }
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
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

export default function RecentActivity() {
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  // Mock data - in real app, this would come from API
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'income',
      title: 'Salary Received',
      description: 'Monthly salary payment from Tech Corp Inc.',
      amount: 5800.00,
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      status: 'completed',
      category: 'Salary',
      familyMember: 'Sarah J.'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Rent Payment',
      description: 'Monthly rent payment to ABC Property Management',
      amount: -1200.00,
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      status: 'completed',
      category: 'Housing'
    },
    {
      id: '3',
      type: 'transaction',
      title: 'Grocery Store',
      description: 'Whole Foods Market purchase - weekly groceries',
      amount: -127.45,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      status: 'completed',
      category: 'Food & Dining'
    },
    {
      id: '4',
      type: 'bank_sync',
      title: 'Bank Sync Completed',
      description: 'Successfully synced transactions from Chase Checking',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      status: 'completed'
    },
    {
      id: '5',
      type: 'budget',
      title: 'Budget Alert',
      description: 'You\'re 75% through your dining budget for this month',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      status: 'pending'
    },
    {
      id: '6',
      type: 'family',
      title: 'Family Member Added',
      description: 'Mike Johnson joined your family finance account',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      status: 'completed',
      familyMember: 'Mike J.'
    },
    {
      id: '7',
      type: 'transaction',
      title: 'Gas Station',
      description: 'Shell Gas Station - fuel purchase',
      amount: -45.60,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      status: 'completed',
      category: 'Transportation'
    },
    {
      id: '8',
      type: 'payment',
      title: 'Credit Card Payment',
      description: 'Payment toward Chase Freedom Unlimited',
      amount: -800.00,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      status: 'completed',
      category: 'Credit Cards'
    }
  ]

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(activity => activity.type === filter)

  const displayedActivities = showAll
    ? filteredActivities
    : filteredActivities.slice(0, 5)

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            📰 Recent Activity
          </h2>
          <p className="text-sm text-muted mt-1">Your latest financial activities</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span>Live updates</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <ActivityFilter currentFilter={filter} onFilterChange={setFilter} />

      {/* Activity List */}
      <div className="space-y-3 mt-4">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <div className="text-4xl mb-2">📭</div>
            <p>No recent activity found</p>
            <p className="text-xs mt-1">Activities will appear here as they occur</p>
          </div>
        ) : (
          displayedActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {/* Show More/Less Button */}
      {filteredActivities.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="glass-button-ghost text-sm px-4 py-2 flex items-center gap-2 mx-auto"
          >
            <span>{showAll ? 'Show Less' : `Show All ${filteredActivities.length}`}</span>
            <span className="text-xs">{showAll ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">🔍</span>
          <span>Activity tracking powered by KGiQ</span>
        </div>
        <div className="text-xs text-muted">
          {filteredActivities.length} activities
        </div>
      </div>
    </section>
  )
}