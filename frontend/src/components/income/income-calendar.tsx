'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface CalendarIncomeEvent {
  id: string
  description: string
  source: string
  expectedAmount: number
  receivedAmount?: number
  expectedDate: string
  receivedDate?: string
  status: 'pending' | 'received' | 'overdue' | 'cancelled'
  category: 'salary' | 'freelance' | 'bonus' | 'tax_refund' | 'investment' | 'other'
  isRecurring: boolean
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarIncomeEvent[]
  totalAmount: number
}

const statusConfig = {
  pending: { color: 'text-warning', bg: 'bg-warning/10', icon: '⏳' },
  received: { color: 'text-success', bg: 'bg-success/10', icon: '✅' },
  overdue: { color: 'text-error', bg: 'bg-error/10', icon: '⚠️' },
  cancelled: { color: 'text-muted', bg: 'bg-muted/10', icon: '❌' }
}

const categoryConfig = {
  salary: { icon: '💼', color: 'text-kgiq-primary' },
  freelance: { icon: '🎨', color: 'text-kgiq-secondary' },
  bonus: { icon: '🎁', color: 'text-success' },
  tax_refund: { icon: '🏛️', color: 'text-accent' },
  investment: { icon: '📈', color: 'text-kgiq-tertiary' },
  other: { icon: '💰', color: 'text-muted' }
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function IncomeCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarIncomeEvent | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  // Mock income events - would come from API in real app
  const incomeEvents: CalendarIncomeEvent[] = [
    {
      id: '1',
      description: 'Monthly Salary - December 2024',
      source: 'ABC Corp',
      expectedAmount: 2100,
      receivedAmount: 2100,
      expectedDate: '2024-12-15',
      receivedDate: '2024-12-15',
      status: 'received',
      category: 'salary',
      isRecurring: true
    },
    {
      id: '2',
      description: 'Freelance Project Payment',
      source: 'XYZ Design Agency',
      expectedAmount: 850,
      expectedDate: '2024-12-20',
      status: 'pending',
      category: 'freelance',
      isRecurring: false
    },
    {
      id: '3',
      description: 'Holiday Bonus',
      source: 'ABC Corp',
      expectedAmount: 500,
      expectedDate: '2024-12-10',
      status: 'overdue',
      category: 'bonus',
      isRecurring: false
    },
    {
      id: '4',
      description: 'Investment Dividends',
      source: 'Portfolio Returns',
      expectedAmount: 125,
      receivedAmount: 125,
      expectedDate: '2024-12-05',
      receivedDate: '2024-12-05',
      status: 'received',
      category: 'investment',
      isRecurring: false
    },
    {
      id: '5',
      description: 'Monthly Salary - January 2025',
      source: 'ABC Corp',
      expectedAmount: 2100,
      expectedDate: '2025-01-15',
      status: 'pending',
      category: 'salary',
      isRecurring: true
    },
    {
      id: '6',
      description: 'Tax Refund',
      source: 'IRS',
      expectedAmount: 1200,
      expectedDate: '2025-01-30',
      status: 'pending',
      category: 'tax_refund',
      isRecurring: false
    }
  ]

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days: CalendarDay[] = []
    const today = new Date()

    // Previous month days
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i)
      const dayEvents = incomeEvents.filter(event => {
        const eventDate = new Date(event.expectedDate)
        return eventDate.toDateString() === date.toDateString()
      })

      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: dayEvents,
        totalAmount: dayEvents.reduce((sum, event) => sum + event.expectedAmount, 0)
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayEvents = incomeEvents.filter(event => {
        const eventDate = new Date(event.expectedDate)
        return eventDate.toDateString() === date.toDateString()
      })

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        events: dayEvents,
        totalAmount: dayEvents.reduce((sum, event) => sum + event.expectedAmount, 0)
      })
    }

    // Next month days
    const totalDays = Math.ceil(days.length / 7) * 7
    const remainingDays = totalDays - days.length

    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      const dayEvents = incomeEvents.filter(event => {
        const eventDate = new Date(event.expectedDate)
        return eventDate.toDateString() === date.toDateString()
      })

      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: dayEvents,
        totalAmount: dayEvents.reduce((sum, event) => sum + event.expectedAmount, 0)
      })
    }

    return days
  }, [currentDate, incomeEvents])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthTotal = incomeEvents
    .filter(event => {
      const eventDate = new Date(event.expectedDate)
      return eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear()
    })
    .reduce((sum, event) => sum + event.expectedAmount, 0)

  const monthReceived = incomeEvents
    .filter(event => {
      const eventDate = new Date(event.expectedDate)
      return eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear() &&
             event.status === 'received'
    })
    .reduce((sum, event) => sum + (event.receivedAmount || event.expectedAmount), 0)

  return (
    <div className="space-y-6">

      {/* Calendar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-muted hover:text-primary transition-colors"
            >
              <span className="text-lg">◀️</span>
            </button>
            <h2 className="text-2xl font-bold text-primary min-w-[200px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-muted hover:text-primary transition-colors"
            >
              <span className="text-lg">▶️</span>
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-kgiq-primary/20 hover:bg-kgiq-primary/30 text-kgiq-primary rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border border-glass-border/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'month' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
              }`}
            >
              📅 Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'week' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
              }`}
            >
              📆 Week
            </button>
          </div>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-kgiq-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-kgiq-primary/20 flex items-center justify-center">
              <span className="text-kgiq-primary text-lg">💰</span>
            </div>
            <div>
              <p className="text-sm text-muted">Expected This Month</p>
              <p className="text-xl font-bold text-primary">${monthTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-success/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <span className="text-success text-lg">✅</span>
            </div>
            <div>
              <p className="text-sm text-muted">Received This Month</p>
              <p className="text-xl font-bold text-success">${monthReceived.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-lg">📊</span>
            </div>
            <div>
              <p className="text-sm text-muted">Collection Rate</p>
              <p className="text-xl font-bold text-accent">
                {monthTotal > 0 ? ((monthReceived / monthTotal) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card p-6 border-glass-border/50">

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(dayName => (
            <div key={dayName} className="p-2 text-center text-sm font-medium text-muted">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const hasEvents = day.events.length > 0
            const isSelected = selectedEvent && day.events.some(event => event.id === selectedEvent.id)

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border rounded-lg transition-colors ${
                  day.isCurrentMonth
                    ? 'border-glass-border/30 bg-glass-bg-light/30'
                    : 'border-glass-border/10 bg-glass-bg/10'
                } ${
                  day.isToday
                    ? 'border-kgiq-primary bg-kgiq-primary/5'
                    : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-kgiq-primary'
                    : ''
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth ? 'text-primary' : 'text-muted'
                } ${
                  day.isToday ? 'text-kgiq-primary' : ''
                }`}>
                  {day.date.getDate()}
                  {day.isToday && (
                    <span className="ml-1 px-1 py-0.5 bg-kgiq-primary text-white text-xs rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {hasEvents && (
                  <div className="space-y-1">
                    {day.events.slice(0, 2).map(event => {
                      const status = statusConfig[event.status]
                      const category = categoryConfig[event.category]

                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`p-1.5 rounded text-xs cursor-pointer transition-colors ${status.bg} hover:opacity-80`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{category.icon}</span>
                            <span className={`font-medium ${status.color}`}>
                              ${event.expectedAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className={`truncate ${status.color} opacity-75`}>
                            {event.description}
                          </div>
                        </div>
                      )
                    })}

                    {day.events.length > 2 && (
                      <div className="text-xs text-center text-muted py-1">
                        +{day.events.length - 2} more
                      </div>
                    )}

                    {day.totalAmount > 0 && (
                      <div className="text-xs text-center font-semibold text-primary border-t border-glass-border/20 pt-1 mt-1">
                        Total: ${day.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Event Details Sidebar */}
      {selectedEvent && (
        <div className="glass-card p-6 border-kgiq-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${statusConfig[selectedEvent.status].bg} flex items-center justify-center`}>
                <span className="text-xl">{categoryConfig[selectedEvent.category].icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">{selectedEvent.description}</h3>
                <p className="text-muted">{selectedEvent.source}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="p-2 text-muted hover:text-primary transition-colors"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted">Expected Amount</label>
                <p className="text-xl font-bold text-primary">${selectedEvent.expectedAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted">Expected Date</label>
                <p className="text-primary">{new Date(selectedEvent.expectedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted">Status</label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 ${statusConfig[selectedEvent.status].bg} ${statusConfig[selectedEvent.status].color} text-sm rounded-full`}>
                    {statusConfig[selectedEvent.status].icon} {selectedEvent.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedEvent.receivedAmount && (
                <div>
                  <label className="text-sm text-muted">Received Amount</label>
                  <p className="text-xl font-bold text-success">${selectedEvent.receivedAmount.toLocaleString()}</p>
                </div>
              )}
              {selectedEvent.receivedDate && (
                <div>
                  <label className="text-sm text-muted">Received Date</label>
                  <p className="text-success">{new Date(selectedEvent.receivedDate).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted">Type</label>
                <div className="flex items-center gap-2">
                  <span className="text-primary capitalize">{selectedEvent.category.replace('_', ' ')}</span>
                  {selectedEvent.isRecurring && (
                    <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                      🔄 Recurring
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-glass-border/30">
            <Link
              href={`/income/${selectedEvent.id}`}
              className="px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
            >
              View Details
            </Link>
            <Link
              href={`/income/${selectedEvent.id}/edit`}
              className="px-6 py-3 border border-glass-border/50 bg-glass-bg hover:bg-glass-bg-light text-muted hover:text-primary rounded-lg transition-colors"
            >
              Edit Event
            </Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="glass-card p-4 border-glass-border/50">
        <h3 className="text-sm font-semibold text-primary mb-3">Legend</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${config.bg}`}></div>
              <span className="text-sm text-muted capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}