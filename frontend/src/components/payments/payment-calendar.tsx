'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isPast } from 'date-fns'

interface Payment {
  id: string
  description: string
  payee: string
  amount: number
  dueDate: Date
  paidDate?: Date
  status: 'scheduled' | 'paid' | 'overdue' | 'cancelled' | 'partial'
  category: string
  priority: 'low' | 'medium' | 'high'
  isRecurring: boolean
  notes?: string
}

interface PaymentCalendarProps {
  payments?: Payment[]
  onDateClick?: (date: Date) => void
  onPaymentClick?: (payment: Payment) => void
  selectedDate?: Date
}

export default function PaymentCalendar({
  payments = [],
  onDateClick,
  onPaymentClick,
  selectedDate
}: PaymentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const dailyPayments = useMemo(() => {
    const dailyData = new Map()

    daysInMonth.forEach(day => {
      const dayPayments = payments.filter(payment => isSameDay(payment.dueDate, day))
      const totalAmount = dayPayments.reduce((sum, payment) => sum + payment.amount, 0)
      const paidAmount = dayPayments
        .filter(payment => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.amount, 0)
      const overduePayments = dayPayments.filter(payment => payment.status === 'overdue')
      const highPriorityPayments = dayPayments.filter(payment => payment.priority === 'high')

      dailyData.set(day.toDateString(), {
        date: day,
        payments: dayPayments,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        overdueCount: overduePayments.length,
        highPriorityCount: highPriorityPayments.length
      })
    })

    return dailyData
  }, [payments, daysInMonth])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/20 text-success'
      case 'overdue': return 'bg-error/20 text-error'
      case 'partial': return 'bg-warning/20 text-warning'
      case 'cancelled': return 'bg-muted/20 text-muted'
      default: return 'bg-kgiq-primary/20 text-kgiq-primary'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      default: return '🟢'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'housing': return '🏠'
      case 'utilities': return '💡'
      case 'insurance': return '🛡️'
      case 'debt': return '💳'
      case 'subscription': return '📱'
      default: return '💸'
    }
  }

  const handleDateClick = (date: Date) => {
    onDateClick?.(date)
  }

  const handlePaymentClick = (e: React.MouseEvent, payment: Payment) => {
    e.stopPropagation()
    onPaymentClick?.(payment)
  }

  // Calculate month summary
  const monthSummary = useMemo(() => {
    const monthPayments = payments.filter(payment =>
      payment.dueDate >= monthStart && payment.dueDate <= monthEnd
    )

    const totalDue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalPaid = monthPayments
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const overdueCount = monthPayments.filter(payment => payment.status === 'overdue').length
    const scheduledCount = monthPayments.filter(payment => payment.status === 'scheduled').length

    return {
      totalDue,
      totalPaid,
      remaining: totalDue - totalPaid,
      overdueCount,
      scheduledCount,
      totalPayments: monthPayments.length
    }
  }, [payments, monthStart, monthEnd])

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Payment Calendar</h2>
          <p className="text-muted mt-1">{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 bg-glass-bg hover:bg-glass-bg-light border border-glass-border/50 rounded-lg text-primary transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 bg-glass-bg hover:bg-glass-bg-light border border-glass-border/50 rounded-lg text-primary text-sm transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 bg-glass-bg hover:bg-glass-bg-light border border-glass-border/50 rounded-lg text-primary transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="glass-card p-4 border-kgiq-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-kgiq-primary">💸</span>
            <div>
              <p className="text-xs text-muted">Total Due</p>
              <p className="text-sm font-semibold text-primary">${monthSummary.totalDue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-success/20">
          <div className="flex items-center gap-2">
            <span className="text-success">✅</span>
            <div>
              <p className="text-xs text-muted">Paid</p>
              <p className="text-sm font-semibold text-success">${monthSummary.totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-warning/20">
          <div className="flex items-center gap-2">
            <span className="text-warning">💰</span>
            <div>
              <p className="text-xs text-muted">Remaining</p>
              <p className="text-sm font-semibold text-warning">${monthSummary.remaining.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-error/20">
          <div className="flex items-center gap-2">
            <span className="text-error">⚠️</span>
            <div>
              <p className="text-xs text-muted">Overdue</p>
              <p className="text-sm font-semibold text-error">{monthSummary.overdueCount}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-accent/20">
          <div className="flex items-center gap-2">
            <span className="text-accent">📊</span>
            <div>
              <p className="text-xs text-muted">Total</p>
              <p className="text-sm font-semibold text-accent">{monthSummary.totalPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-glass-bg-light rounded-lg p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map(day => {
            const dayData = dailyPayments.get(day.toDateString())
            const hasPayments = dayData && dayData.payments.length > 0
            const isSelectedDate = selectedDate && isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)
            const isPastDate = isPast(day) && !isTodayDate

            return (
              <div
                key={day.toDateString()}
                onClick={() => handleDateClick(day)}
                className={`
                  min-h-[120px] p-2 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-glass-bg
                  ${isTodayDate ? 'border-kgiq-primary/50 bg-kgiq-primary/5' : 'border-glass-border/30'}
                  ${isSelectedDate ? 'ring-2 ring-kgiq-primary/50' : ''}
                  ${isPastDate ? 'opacity-75' : ''}
                `}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isTodayDate ? 'text-kgiq-primary' : 'text-primary'}`}>
                    {format(day, 'd')}
                  </span>
                  {hasPayments && dayData.overdueCount > 0 && (
                    <span className="w-2 h-2 bg-error rounded-full"></span>
                  )}
                </div>

                {/* Payments for this day */}
                {hasPayments && (
                  <div className="space-y-1">
                    {dayData.payments.slice(0, 3).map((payment: Payment) => (
                      <div
                        key={payment.id}
                        onClick={(e) => handlePaymentClick(e, payment)}
                        className={`
                          px-2 py-1 rounded text-xs cursor-pointer transition-colors
                          ${getStatusColor(payment.status)}
                        `}
                        title={`${payment.payee} - $${payment.amount.toLocaleString()}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{getCategoryIcon(payment.category)}</span>
                          <span className="truncate flex-1">{payment.payee}</span>
                          {payment.priority === 'high' && (
                            <span>{getPriorityIcon(payment.priority)}</span>
                          )}
                        </div>
                        <div className="font-semibold">
                          ${payment.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}

                    {/* Show more indicator */}
                    {dayData.payments.length > 3 && (
                      <div className="text-xs text-muted text-center py-1">
                        +{dayData.payments.length - 3} more
                      </div>
                    )}

                    {/* Daily total */}
                    {dayData.totalAmount > 0 && (
                      <div className="text-xs text-accent font-semibold border-t border-glass-border/30 pt-1">
                        Total: ${dayData.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-kgiq-primary/20 rounded"></div>
          <span className="text-muted">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-success/20 rounded"></div>
          <span className="text-muted">Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-error/20 rounded"></div>
          <span className="text-muted">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-warning/20 rounded"></div>
          <span className="text-muted">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🔴</span>
          <span className="text-muted">High Priority</span>
        </div>
      </div>

      {/* KGiQ Footer */}
      <div className="flex items-center justify-center mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">📅</span>
          <span>Payment scheduling powered by KGiQ Finance</span>
        </div>
      </div>
    </div>
  )
}