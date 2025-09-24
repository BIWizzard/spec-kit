'use client'

import { useState } from 'react'
import Link from 'next/link'

interface UpcomingEvent {
  id: string
  type: 'income' | 'payment' | 'bill'
  title: string
  description: string
  amount: number
  date: string
  category?: string
  priority: 'high' | 'medium' | 'low'
  status: 'scheduled' | 'overdue' | 'due_soon'
  recurring?: {
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
    nextDate: string
  }
}

interface EventTypeConfig {
  icon: string
  color: string
  bgColor: string
  label: string
}

const eventTypeConfig: Record<UpcomingEvent['type'], EventTypeConfig> = {
  income: {
    icon: '💵',
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Income'
  },
  payment: {
    icon: '💸',
    color: 'text-error',
    bgColor: 'bg-error/10',
    label: 'Payment'
  },
  bill: {
    icon: '📋',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Bill'
  }
}

const priorityConfig = {
  high: { color: 'text-error', bg: 'bg-error/20', label: 'High' },
  medium: { color: 'text-warning', bg: 'bg-warning/20', label: 'Medium' },
  low: { color: 'text-success', bg: 'bg-success/20', label: 'Low' }
}

const statusConfig = {
  scheduled: { color: 'text-muted', bg: 'bg-glass-bg', label: 'Scheduled' },
  overdue: { color: 'text-error', bg: 'bg-error/20', label: 'Overdue' },
  due_soon: { color: 'text-warning', bg: 'bg-warning/20', label: 'Due Soon' }
}

function EventItem({ event }: { event: UpcomingEvent }) {
  const typeConfig = eventTypeConfig[event.type]
  const statusInfo = statusConfig[event.status]
  const priorityInfo = priorityConfig[event.priority]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return 'Overdue'
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Tomorrow'
    if (diffInDays <= 7) return `In ${diffInDays} days`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount))
  }

  const getDateColor = () => {
    const date = new Date(event.date)
    const now = new Date()
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0) return 'text-error'
    if (diffInDays <= 2) return 'text-warning'
    return 'text-muted'
  }

  return (
    <div className={`glass-card p-4 hover:bg-glass-bg-light transition-all duration-200 group cursor-pointer border-l-2 ${
      event.status === 'overdue' ? 'border-l-error' :
      event.status === 'due_soon' ? 'border-l-warning' : 'border-l-glass-border'
    }`}>
      <div className="flex items-start gap-3">
        {/* Event Type Icon */}
        <div className={`w-8 h-8 rounded-lg ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-sm">{typeConfig.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-primary font-medium text-sm truncate">
                  {event.title}
                </h3>
                {event.recurring && (
                  <span className="text-xs text-kgiq-primary bg-kgiq-primary/10 px-1.5 py-0.5 rounded">
                    🔄
                  </span>
                )}
              </div>

              <p className="text-muted text-xs line-clamp-1 mb-2">
                {event.description}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} font-medium`}>
                  {statusInfo.label}
                </span>

                {event.priority !== 'low' && (
                  <span className={`px-2 py-1 rounded-full ${priorityInfo.bg} ${priorityInfo.color} font-medium`}>
                    {priorityInfo.label}
                  </span>
                )}

                {event.category && (
                  <span className="text-muted">
                    🏷️ {event.category}
                  </span>
                )}
              </div>
            </div>

            {/* Amount and Date */}
            <div className="flex flex-col items-end gap-1 text-right">
              <span className={`text-sm font-semibold ${
                event.type === 'income' ? 'text-success' : 'text-error'
              }`}>
                {event.type === 'income' ? '+' : '-'}{formatAmount(event.amount)}
              </span>

              <span className={`text-xs font-medium ${getDateColor()}`}>
                {formatDate(event.date)}
              </span>

              {event.recurring && (
                <span className="text-xs text-muted">
                  Next: {new Date(event.recurring.nextDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventTypeFilter({
  currentFilter,
  onFilterChange
}: {
  currentFilter: string
  onFilterChange: (filter: string) => void
}) {
  const filters = [
    { value: 'all', label: 'All', icon: '📅' },
    { value: 'income', label: 'Income', icon: '💵' },
    { value: 'payment', label: 'Payments', icon: '💸' },
    { value: 'bill', label: 'Bills', icon: '📋' }
  ]

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
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

export default function UpcomingEvents() {
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  // Mock data - in real app, this would come from API
  const upcomingEvents: UpcomingEvent[] = [
    {
      id: '1',
      type: 'income',
      title: 'Salary Payment',
      description: 'Monthly salary from Tech Corp Inc.',
      amount: 5800.00,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      category: 'Salary',
      priority: 'high',
      status: 'scheduled',
      recurring: {
        frequency: 'monthly',
        nextDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '2',
      type: 'bill',
      title: 'Electric Bill',
      description: 'Pacific Gas & Electric monthly bill',
      amount: 150.00,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      category: 'Utilities',
      priority: 'medium',
      status: 'due_soon',
      recurring: {
        frequency: 'monthly',
        nextDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '3',
      type: 'payment',
      title: 'Credit Card Payment',
      description: 'Chase Freedom Unlimited minimum payment',
      amount: 250.00,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday (overdue)
      category: 'Credit Cards',
      priority: 'high',
      status: 'overdue'
    },
    {
      id: '4',
      type: 'bill',
      title: 'Internet Service',
      description: 'Comcast Xfinity monthly internet',
      amount: 89.99,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      category: 'Utilities',
      priority: 'medium',
      status: 'scheduled',
      recurring: {
        frequency: 'monthly',
        nextDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '5',
      type: 'payment',
      title: 'Car Insurance',
      description: 'State Farm auto insurance premium',
      amount: 125.00,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      category: 'Insurance',
      priority: 'medium',
      status: 'scheduled',
      recurring: {
        frequency: 'monthly',
        nextDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '6',
      type: 'income',
      title: 'Freelance Payment',
      description: 'Design project payment from Client ABC',
      amount: 1200.00,
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      category: 'Freelance',
      priority: 'medium',
      status: 'scheduled'
    }
  ]

  const filteredEvents = filter === 'all'
    ? upcomingEvents
    : upcomingEvents.filter(event => event.type === filter)

  // Sort by date (earliest first)
  const sortedEvents = filteredEvents.sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const displayedEvents = showAll ? sortedEvents : sortedEvents.slice(0, 4)

  // Calculate summary stats
  const totalIncome = filteredEvents
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalOutgoing = filteredEvents
    .filter(e => e.type !== 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const overdueCount = filteredEvents.filter(e => e.status === 'overdue').length

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            📅 Upcoming Events
          </h2>
          <p className="text-sm text-muted mt-1">Next 30 days</p>
        </div>

        {overdueCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-error bg-error/10 px-3 py-1.5 rounded-lg">
            <span>⚠️</span>
            {overdueCount} overdue
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 glass-card bg-success/5">
          <p className="text-lg font-bold text-success">+${totalIncome.toLocaleString()}</p>
          <p className="text-xs text-muted">Incoming</p>
        </div>
        <div className="text-center p-3 glass-card bg-error/5">
          <p className="text-lg font-bold text-error">-${totalOutgoing.toLocaleString()}</p>
          <p className="text-xs text-muted">Outgoing</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <EventTypeFilter currentFilter={filter} onFilterChange={setFilter} />

      {/* Events List */}
      <div className="space-y-3 mt-4">
        {displayedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <div className="text-4xl mb-2">📅</div>
            <p>No upcoming events</p>
            <p className="text-xs mt-1">Events will appear here when scheduled</p>
          </div>
        ) : (
          displayedEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))
        )}
      </div>

      {/* Show More/Less & Actions */}
      <div className="mt-4 flex items-center justify-between">
        {sortedEvents.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="glass-button-ghost text-sm px-3 py-2 flex items-center gap-2"
          >
            <span>{showAll ? 'Show Less' : `Show All ${sortedEvents.length}`}</span>
            <span className="text-xs">{showAll ? '▲' : '▼'}</span>
          </button>
        )}

        <Link href="/calendar" className="glass-button-primary text-sm px-3 py-2 ml-auto">
          View Calendar
        </Link>
      </div>

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-center mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">📋</span>
          <span>Event scheduling powered by KGiQ</span>
        </div>
      </div>
    </section>
  )
}