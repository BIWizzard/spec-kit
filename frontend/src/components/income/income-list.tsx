'use client'

import { useState } from 'react'
import Link from 'next/link'

interface IncomeEvent {
  id: string
  description: string
  source: string
  expectedAmount: number
  receivedAmount?: number
  expectedDate: string
  receivedDate?: string
  status: 'pending' | 'received' | 'overdue' | 'cancelled'
  isRecurring: boolean
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually'
  category: 'salary' | 'freelance' | 'bonus' | 'tax_refund' | 'investment' | 'other'
  bankAccount?: string
  attributionCount: number
  attributedAmount: number
  notes?: string
}

interface IncomeStatusConfig {
  icon: string
  color: string
  bgColor: string
  label: string
}

const statusConfig: Record<IncomeEvent['status'], IncomeStatusConfig> = {
  pending: {
    icon: '⏳',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Pending'
  },
  received: {
    icon: '✅',
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Received'
  },
  overdue: {
    icon: '⚠️',
    color: 'text-error',
    bgColor: 'bg-error/10',
    label: 'Overdue'
  },
  cancelled: {
    icon: '❌',
    color: 'text-muted',
    bgColor: 'bg-muted/10',
    label: 'Cancelled'
  }
}

const categoryConfig = {
  salary: { icon: '💼', label: 'Salary', color: 'text-kgiq-primary' },
  freelance: { icon: '🎨', label: 'Freelance', color: 'text-kgiq-secondary' },
  bonus: { icon: '🎁', label: 'Bonus', color: 'text-success' },
  tax_refund: { icon: '🏛️', label: 'Tax Refund', color: 'text-accent' },
  investment: { icon: '📈', label: 'Investment', color: 'text-kgiq-tertiary' },
  other: { icon: '💰', label: 'Other', color: 'text-muted' }
}

export default function IncomeList() {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<'all' | IncomeEvent['status']>('all')
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list')

  // Mock data - would come from API/context in real app
  const incomeEvents: IncomeEvent[] = [
    {
      id: '1',
      description: 'Monthly Salary - December 2024',
      source: 'ABC Corp',
      expectedAmount: 2100,
      receivedAmount: 2100,
      expectedDate: '2024-12-15',
      receivedDate: '2024-12-15',
      status: 'received',
      isRecurring: true,
      frequency: 'monthly',
      category: 'salary',
      bankAccount: 'Chase Checking (...4567)',
      attributionCount: 4,
      attributedAmount: 1670,
      notes: 'Regular biweekly payroll deposit'
    },
    {
      id: '2',
      description: 'Freelance Project - Website Design',
      source: 'XYZ Design Agency',
      expectedAmount: 850,
      expectedDate: '2024-12-20',
      status: 'pending',
      isRecurring: false,
      category: 'freelance',
      attributionCount: 2,
      attributedAmount: 600,
      notes: 'Final payment for Q4 project'
    },
    {
      id: '3',
      description: 'Holiday Bonus',
      source: 'ABC Corp',
      expectedAmount: 500,
      expectedDate: '2024-12-10',
      status: 'overdue',
      isRecurring: false,
      category: 'bonus',
      attributionCount: 0,
      attributedAmount: 0
    },
    {
      id: '4',
      description: 'Monthly Salary - January 2025',
      source: 'ABC Corp',
      expectedAmount: 2100,
      expectedDate: '2025-01-15',
      status: 'pending',
      isRecurring: true,
      frequency: 'monthly',
      category: 'salary',
      attributionCount: 3,
      attributedAmount: 1200
    }
  ]

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedEvents = incomeEvents
    .filter(event => filterStatus === 'all' || event.status === filterStatus)
    .sort((a, b) => {
      let aValue, bValue
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.expectedDate).getTime()
          bValue = new Date(b.expectedDate).getTime()
          break
        case 'amount':
          aValue = a.expectedAmount
          bValue = b.expectedAmount
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const totalPendingAmount = incomeEvents
    .filter(event => event.status === 'pending')
    .reduce((sum, event) => sum + event.expectedAmount, 0)

  const totalReceivedAmount = incomeEvents
    .filter(event => event.status === 'received')
    .reduce((sum, event) => sum + (event.receivedAmount || 0), 0)

  return (
    <div className="space-y-6">

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-success/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <span className="text-success text-lg">✅</span>
            </div>
            <div>
              <p className="text-sm text-muted">Received This Month</p>
              <p className="text-xl font-bold text-success">${totalReceivedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-warning/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <span className="text-warning text-lg">⏳</span>
            </div>
            <div>
              <p className="text-sm text-muted">Pending Income</p>
              <p className="text-xl font-bold text-warning">${totalPendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-lg">📊</span>
            </div>
            <div>
              <p className="text-sm text-muted">Total Events</p>
              <p className="text-xl font-bold text-accent">{incomeEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 border-glass-border/50">
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted">Sort:</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as typeof sortBy)
                  setSortOrder(order as typeof sortOrder)
                }}
                className="px-3 py-1.5 bg-glass-bg border border-glass-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="status-asc">Status (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center border border-glass-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'card' ? 'bg-kgiq-primary text-white' : 'text-muted hover:text-primary'
                }`}
              >
                📇 Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Income Events */}
      {viewMode === 'list' ? (
        <div className="glass-card border-glass-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border/30">
                  <th className="text-left p-4 text-sm font-medium text-muted">Event</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Source</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Attribution</th>
                  <th className="text-left p-4 text-sm font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEvents.map((event) => {
                  const status = statusConfig[event.status]
                  const category = categoryConfig[event.category]
                  const attributionPercentage = event.expectedAmount > 0 ? (event.attributedAmount / event.expectedAmount * 100) : 0

                  return (
                    <tr key={event.id} className="border-b border-glass-border/20 hover:bg-glass-bg-light/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${category.color.replace('text-', 'bg-')}/20 flex items-center justify-center`}>
                            <span className="text-sm">{category.icon}</span>
                          </div>
                          <div>
                            <Link href={`/income/${event.id}`} className="font-medium text-primary hover:text-accent transition-colors">
                              {event.description}
                            </Link>
                            <p className="text-sm text-muted">{category.label}</p>
                            {event.isRecurring && (
                              <span className="inline-block px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full mt-1">
                                🔄 {event.frequency}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-primary">{event.source}</p>
                        {event.bankAccount && <p className="text-sm text-muted">{event.bankAccount}</p>}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-primary">${event.expectedAmount.toLocaleString()}</p>
                        {event.receivedAmount && event.receivedAmount !== event.expectedAmount && (
                          <p className="text-sm text-success">Received: ${event.receivedAmount.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-primary">{new Date(event.expectedDate).toLocaleDateString()}</p>
                        {event.receivedDate && (
                          <p className="text-sm text-success">Received: {new Date(event.receivedDate).toLocaleDateString()}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 ${status.bgColor} ${status.color} text-xs rounded-full`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm text-primary">{event.attributionCount} payments</p>
                          <p className="text-sm text-muted">${event.attributedAmount.toLocaleString()} ({attributionPercentage.toFixed(0)}%)</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/income/${event.id}`} className="p-1 text-muted hover:text-primary transition-colors" title="View Details">
                            <span className="text-sm">👁️</span>
                          </Link>
                          <Link href={`/income/${event.id}/edit`} className="p-1 text-muted hover:text-accent transition-colors" title="Edit">
                            <span className="text-sm">✏️</span>
                          </Link>
                          <button className="p-1 text-muted hover:text-error transition-colors" title="Delete">
                            <span className="text-sm">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedEvents.map((event) => {
            const status = statusConfig[event.status]
            const category = categoryConfig[event.category]
            const attributionPercentage = event.expectedAmount > 0 ? (event.attributedAmount / event.expectedAmount * 100) : 0

            return (
              <div key={event.id} className="glass-card p-6 border-glass-border/50 hover:border-kgiq-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${category.color.replace('text-', 'bg-')}/20 flex items-center justify-center`}>
                      <span className="text-lg">{category.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{event.description}</h3>
                      <p className="text-sm text-muted">{event.source}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 ${status.bgColor} ${status.color} text-xs rounded-full`}>
                    {status.icon} {status.label}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Expected Amount</span>
                    <span className="font-semibold text-primary">${event.expectedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Expected Date</span>
                    <span className="text-primary">{new Date(event.expectedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Attributed</span>
                    <span className="text-accent">{event.attributionCount} payments ({attributionPercentage.toFixed(0)}%)</span>
                  </div>
                  {event.receivedAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Received</span>
                      <span className="text-success font-semibold">${event.receivedAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {event.isRecurring && (
                      <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                        🔄 {event.frequency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/income/${event.id}`} className="p-2 text-muted hover:text-primary transition-colors" title="View Details">
                      <span>👁️</span>
                    </Link>
                    <Link href={`/income/${event.id}/edit`} className="p-2 text-muted hover:text-accent transition-colors" title="Edit">
                      <span>✏️</span>
                    </Link>
                    <button className="p-2 text-muted hover:text-error transition-colors" title="Delete">
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredAndSortedEvents.length === 0 && (
        <div className="glass-card p-12 border-glass-border/50 text-center">
          <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No Income Events Found</h3>
          <p className="text-muted mb-4">
            {filterStatus === 'all'
              ? 'You haven\'t created any income events yet.'
              : `No income events with status "${filterStatus}" found.`}
          </p>
          <Link
            href="/income/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
          >
            <span className="text-xl">+</span>
            Create Your First Income Event
          </Link>
        </div>
      )}

    </div>
  )
}