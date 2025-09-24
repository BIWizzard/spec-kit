'use client'

import { useState } from 'react'

interface Insight {
  id: string
  type: 'spending_trend' | 'savings_goal' | 'budget_alert' | 'cash_flow' | 'recommendation'
  title: string
  description: string
  severity: 'info' | 'warning' | 'success' | 'error'
  impact: 'high' | 'medium' | 'low'
  data?: {
    current?: number
    target?: number
    percentage?: number
    trend?: 'up' | 'down' | 'stable'
    comparison?: 'better' | 'worse' | 'same'
  }
  actionable: boolean
  actionText?: string
  actionUrl?: string
}

interface InsightTypeConfig {
  icon: string
  color: string
  bgColor: string
  label: string
}

const insightTypeConfig: Record<Insight['type'], InsightTypeConfig> = {
  spending_trend: {
    icon: '📈',
    color: 'text-kgiq-tertiary',
    bgColor: 'bg-kgiq-tertiary/10',
    label: 'Spending Trend'
  },
  savings_goal: {
    icon: '🎯',
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Savings Goal'
  },
  budget_alert: {
    icon: '⚠️',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Budget Alert'
  },
  cash_flow: {
    icon: '💰',
    color: 'text-kgiq-primary',
    bgColor: 'bg-kgiq-primary/10',
    label: 'Cash Flow'
  },
  recommendation: {
    icon: '💡',
    color: 'text-kgiq-secondary',
    bgColor: 'bg-kgiq-secondary/10',
    label: 'Recommendation'
  }
}

const severityConfig = {
  info: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/30' },
  warning: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  success: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  error: { color: 'text-error', bg: 'bg-error/10', border: 'border-error/30' }
}

const impactConfig = {
  high: { label: 'High Impact', color: 'text-error', bg: 'bg-error/20' },
  medium: { label: 'Medium Impact', color: 'text-warning', bg: 'bg-warning/20' },
  low: { label: 'Low Impact', color: 'text-muted', bg: 'bg-glass-bg' }
}

function InsightCard({ insight }: { insight: Insight }) {
  const typeConfig = insightTypeConfig[insight.type]
  const severityInfo = severityConfig[insight.severity]
  const impactInfo = impactConfig[insight.impact]

  const renderDataVisualization = () => {
    if (!insight.data) return null

    const { current, target, percentage, trend, comparison } = insight.data

    return (
      <div className="mt-3 p-3 glass-card bg-glass-bg-light">
        <div className="flex items-center justify-between text-sm">
          {current !== undefined && target !== undefined && (
            <div className="flex items-center gap-3">
              <div>
                <span className="text-muted">Current: </span>
                <span className="font-semibold text-primary">${current.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted">Target: </span>
                <span className="font-semibold text-accent">${target.toLocaleString()}</span>
              </div>
            </div>
          )}

          {percentage !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`w-16 h-2 rounded-full bg-glass-bg overflow-hidden`}>
                <div
                  className={`h-full transition-all duration-500 ${
                    percentage >= 100 ? 'bg-success' :
                    percentage >= 75 ? 'bg-warning' : 'bg-kgiq-primary'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-primary">
                {percentage.toFixed(1)}%
              </span>
            </div>
          )}

          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend === 'up' ? 'text-success' :
              trend === 'down' ? 'text-error' : 'text-muted'
            }`}>
              <span>
                {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️'}
              </span>
              <span className="capitalize">{trend}</span>
            </div>
          )}

          {comparison && (
            <div className={`text-sm ${
              comparison === 'better' ? 'text-success' :
              comparison === 'worse' ? 'text-error' : 'text-muted'
            }`}>
              {comparison === 'better' ? '📈 Better' :
               comparison === 'worse' ? '📉 Worse' : '➡️ Same'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card p-4 ${severityInfo.border} hover:shadow-glass-hover transition-all duration-200 group`}>
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-lg">{typeConfig.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-primary font-semibold text-sm">
              {insight.title}
            </h3>

            <div className="flex items-center gap-2">
              {insight.impact !== 'low' && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${impactInfo.bg} ${impactInfo.color}`}>
                  {impactInfo.label}
                </span>
              )}
            </div>
          </div>

          <p className="text-muted text-xs mb-3 leading-relaxed">
            {insight.description}
          </p>

          {renderDataVisualization()}

          {/* Action Button */}
          {insight.actionable && insight.actionText && (
            <div className="mt-3 pt-3 border-t border-glass-border/30">
              <button className="glass-button-primary text-xs px-3 py-2 w-full">
                {insight.actionText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InsightFilter({
  currentFilter,
  onFilterChange
}: {
  currentFilter: string
  onFilterChange: (filter: string) => void
}) {
  const filters = [
    { value: 'all', label: 'All', icon: '🔍' },
    { value: 'high', label: 'High Impact', icon: '🚨' },
    { value: 'actionable', label: 'Actionable', icon: '⚡' }
  ]

  return (
    <div className="flex items-center gap-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
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

export default function FinancialInsights() {
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  // Mock insights data - in real app, this would come from AI analysis
  const insights: Insight[] = [
    {
      id: '1',
      type: 'spending_trend',
      title: 'Dining Spending Up 23%',
      description: 'Your dining expenses have increased significantly this month compared to last month. Consider meal planning to reduce costs.',
      severity: 'warning',
      impact: 'medium',
      data: {
        current: 450,
        target: 300,
        trend: 'up',
        comparison: 'worse'
      },
      actionable: true,
      actionText: 'Set Dining Budget',
      actionUrl: '/budget/categories'
    },
    {
      id: '2',
      type: 'savings_goal',
      title: 'Emergency Fund Progress',
      description: 'Great job! You\'re 73% of the way to your $10,000 emergency fund goal. Keep up the consistent saving.',
      severity: 'success',
      impact: 'high',
      data: {
        current: 7300,
        target: 10000,
        percentage: 73,
        trend: 'up',
        comparison: 'better'
      },
      actionable: true,
      actionText: 'Increase Savings',
      actionUrl: '/budget/allocations'
    },
    {
      id: '3',
      type: 'cash_flow',
      title: 'Positive Cash Flow Streak',
      description: 'You\'ve maintained positive cash flow for 4 consecutive months. This is excellent financial discipline!',
      severity: 'success',
      impact: 'high',
      data: {
        trend: 'up',
        comparison: 'better'
      },
      actionable: false
    },
    {
      id: '4',
      type: 'budget_alert',
      title: 'Entertainment Budget 89% Used',
      description: 'You\'ve used most of your entertainment budget with 8 days remaining in the month. Consider postponing non-essential activities.',
      severity: 'warning',
      impact: 'low',
      data: {
        current: 267,
        target: 300,
        percentage: 89,
        trend: 'stable'
      },
      actionable: true,
      actionText: 'Review Budget',
      actionUrl: '/budget/performance'
    },
    {
      id: '5',
      type: 'recommendation',
      title: 'High-Yield Savings Opportunity',
      description: 'Based on your cash flow, you could earn an extra $180/year by moving surplus funds to a high-yield savings account.',
      severity: 'info',
      impact: 'medium',
      data: {
        current: 1200,
        target: 1380,
        percentage: 15
      },
      actionable: true,
      actionText: 'Explore Options',
      actionUrl: '/bank-accounts/connect'
    },
    {
      id: '6',
      type: 'spending_trend',
      title: 'Subscription Audit Due',
      description: 'It\'s been 6 months since your last subscription review. You might be paying for unused services.',
      severity: 'info',
      impact: 'low',
      actionable: true,
      actionText: 'Review Subscriptions',
      actionUrl: '/transactions/uncategorized'
    }
  ]

  const filteredInsights = insights.filter(insight => {
    if (filter === 'high') return insight.impact === 'high'
    if (filter === 'actionable') return insight.actionable
    return true
  })

  const displayedInsights = showAll ? filteredInsights : filteredInsights.slice(0, 3)

  // Summary stats
  const highImpactCount = insights.filter(i => i.impact === 'high').length
  const actionableCount = insights.filter(i => i.actionable).length

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            🧠 Financial Insights
          </h2>
          <p className="text-sm text-muted mt-1">AI-powered recommendations</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="w-2 h-2 rounded-full bg-kgiq-primary animate-pulse"></div>
          <span>KGiQ AI</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 glass-card bg-error/5">
          <p className="text-lg font-bold text-error">{highImpactCount}</p>
          <p className="text-xs text-muted">High Impact</p>
        </div>
        <div className="text-center p-3 glass-card bg-kgiq-primary/5">
          <p className="text-lg font-bold text-kgiq-primary">{actionableCount}</p>
          <p className="text-xs text-muted">Actionable</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <InsightFilter currentFilter={filter} onFilterChange={setFilter} />
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {displayedInsights.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <div className="text-4xl mb-2">🎯</div>
            <p>No insights available</p>
            <p className="text-xs mt-1">Check back later for personalized recommendations</p>
          </div>
        ) : (
          displayedInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>

      {/* Show More/Less Button */}
      {filteredInsights.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="glass-button-ghost text-sm px-4 py-2 flex items-center gap-2 mx-auto"
          >
            <span>{showAll ? 'Show Less' : `Show All ${filteredInsights.length}`}</span>
            <span className="text-xs">{showAll ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* KGiQ AI Branding Footer */}
      <div className="flex items-center justify-center mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">🤖</span>
          <span>Insights powered by KGiQ AI Intelligence</span>
        </div>
      </div>
    </section>
  )
}