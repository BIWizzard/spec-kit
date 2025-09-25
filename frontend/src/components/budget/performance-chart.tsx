'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  isActive: boolean
}

interface PerformanceData {
  categoryId: string
  period: string
  budgeted: number
  actual: number
  variance: number
  variancePercentage: number
  trend: 'up' | 'down' | 'stable'
}

interface PerformanceChartProps {
  categories: BudgetCategory[]
  performanceData: PerformanceData[]
  timeRange: 'week' | 'month' | 'quarter' | 'year'
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void
  chartType?: 'bar' | 'line' | 'donut' | 'stacked'
  showTrends?: boolean
  showTargets?: boolean
  enableInteraction?: boolean
  className?: string
}

interface ChartData {
  label: string
  budgeted: number
  actual: number
  variance: number
  color: string
  percentage: number
}

const TIME_RANGE_LABELS = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year'
}

export default function PerformanceChart({
  categories,
  performanceData,
  timeRange,
  onTimeRangeChange,
  chartType = 'bar',
  showTrends = true,
  showTargets = true,
  enableInteraction = true,
  className = ''
}: PerformanceChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hoveredData, setHoveredData] = useState<ChartData | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'budgeted' | 'actual' | 'variance'>('variance')

  // Process chart data
  const chartData = useMemo(() => {
    const data: ChartData[] = []

    categories.forEach(category => {
      const performance = performanceData.find(p => p.categoryId === category.id)
      if (performance) {
        data.push({
          label: category.name,
          budgeted: performance.budgeted,
          actual: performance.actual,
          variance: performance.variance,
          color: category.color,
          percentage: performance.variancePercentage
        })
      }
    })

    return data.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.label.localeCompare(b.label)
        case 'budgeted':
          return b.budgeted - a.budgeted
        case 'actual':
          return b.actual - a.actual
        case 'variance':
        default:
          return Math.abs(b.variance) - Math.abs(a.variance)
      }
    })
  }, [categories, performanceData, sortBy])

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalBudgeted = chartData.reduce((sum, item) => sum + item.budgeted, 0)
    const totalActual = chartData.reduce((sum, item) => sum + item.actual, 0)
    const totalVariance = totalActual - totalBudgeted
    const averageVariance = chartData.reduce((sum, item) => sum + Math.abs(item.percentage), 0) / chartData.length

    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      totalVariancePercentage: totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0,
      averageVariance,
      onTrackCategories: chartData.filter(item => Math.abs(item.percentage) <= 10).length,
      overBudgetCategories: chartData.filter(item => item.variance > 0).length,
      underBudgetCategories: chartData.filter(item => item.variance < 0).length
    }
  }, [chartData])

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 50) return 'text-success'
    if (Math.abs(variance) <= 200) return 'text-warning'
    return 'text-error'
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <ArrowTrendingUpIcon className="w-4 h-4" />
    if (variance < 0) return <ArrowTrendingDownIcon className="w-4 h-4" />
    return null
  }

  const renderBarChart = () => {
    if (chartData.length === 0) return null

    const maxValue = Math.max(...chartData.flatMap(item => [item.budgeted, item.actual]))
    const barHeight = 40
    const barSpacing = 60

    return (
      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
              <div className="text-sm text-gray-400">
                ${item.actual.toLocaleString()} / ${item.budgeted.toLocaleString()}
              </div>
            </div>

            <div className="relative">
              {/* Budgeted Bar (Background) */}
              <div className="w-full bg-gray-700 rounded-lg h-3">
                <div
                  className="bg-gray-600 rounded-lg h-3 transition-all duration-500"
                  style={{ width: `${(item.budgeted / maxValue) * 100}%` }}
                />
              </div>

              {/* Actual Bar (Foreground) */}
              <div className="absolute top-0 left-0 w-full">
                <div
                  className="rounded-lg h-3 transition-all duration-500"
                  style={{
                    width: `${(item.actual / maxValue) * 100}%`,
                    backgroundColor: item.actual > item.budgeted
                      ? '#EF4444' // red for over budget
                      : item.color
                  }}
                />
              </div>

              {/* Variance Indicator */}
              {item.variance !== 0 && (
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                  <div className={`flex items-center space-x-1 ${getVarianceColor(item.variance)}`}>
                    {getVarianceIcon(item.variance)}
                    <span className="text-xs font-medium">
                      {item.percentage > 0 ? '+' : ''}{item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDonutChart = () => {
    if (chartData.length === 0) return null

    const total = chartData.reduce((sum, item) => sum + item.actual, 0)
    let cumulativePercentage = 0

    return (
      <div className="flex items-center justify-center">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="rgb(75 85 99)" // gray-600
              strokeWidth="8"
            />

            {chartData.map((item, index) => {
              const percentage = (item.actual / total) * 100
              const strokeDasharray = `${percentage * 2.51} ${(100 - percentage) * 2.51}`
              const strokeDashoffset = -cumulativePercentage * 2.51

              cumulativePercentage += percentage

              return (
                <circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 hover:stroke-[10]"
                  style={{
                    filter: selectedCategory === item.label ? 'brightness(1.2)' : 'none'
                  }}
                />
              )
            })}
          </svg>

          {/* Center Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                ${summary.totalActual.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Total Spent</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStackedChart = () => {
    if (chartData.length === 0) return null

    const maxBudget = Math.max(...chartData.map(item => item.budgeted))

    return (
      <div className="space-y-6">
        {chartData.map((item, index) => {
          const budgetedHeight = (item.budgeted / maxBudget) * 200
          const actualHeight = Math.min((item.actual / maxBudget) * 200, budgetedHeight)
          const overBudgetHeight = item.actual > item.budgeted
            ? ((item.actual - item.budgeted) / maxBudget) * 200
            : 0

          return (
            <div key={item.label} className="flex items-end space-x-4">
              <div className="w-24 text-sm text-white text-right">{item.label}</div>

              <div className="relative flex-1">
                {/* Budget Bar */}
                <div
                  className="bg-gray-600 rounded-t-lg"
                  style={{ height: `${budgetedHeight}px`, width: '60px' }}
                >
                  {/* Actual Spending */}
                  <div
                    className="rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${actualHeight}px`,
                      backgroundColor: item.color,
                      width: '100%'
                    }}
                  />

                  {/* Over Budget */}
                  {overBudgetHeight > 0 && (
                    <div
                      className="bg-error rounded-t-lg"
                      style={{ height: `${overBudgetHeight}px`, width: '100%' }}
                    />
                  )}
                </div>

                {/* Labels */}
                <div className="mt-2 text-xs text-gray-400">
                  <div>${item.actual.toLocaleString()}</div>
                  <div className="text-gray-500">/ ${item.budgeted.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`glassmorphic p-6 rounded-lg border border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-white">Budget Performance</h3>
            <p className="text-sm text-gray-400">
              {TIME_RANGE_LABELS[timeRange]} • {chartData.length} categories
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => {
              // This would need to be handled by parent component
              console.log('Chart type changed to:', e.target.value)
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="bar">Bar Chart</option>
            <option value="donut">Donut Chart</option>
            <option value="stacked">Stacked Chart</option>
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as any)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glassmorphic p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Budgeted</p>
              <p className="text-lg font-semibold text-white">
                ${summary.totalBudgeted.toLocaleString()}
              </p>
            </div>
            <CalendarIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="glassmorphic p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Spent</p>
              <p className="text-lg font-semibold text-white">
                ${summary.totalActual.toLocaleString()}
              </p>
            </div>
            <div className={`${getVarianceColor(summary.totalVariance)}`}>
              {getVarianceIcon(summary.totalVariance)}
            </div>
          </div>
        </div>

        <div className="glassmorphic p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Variance</p>
              <p className={`text-lg font-semibold ${getVarianceColor(summary.totalVariance)}`}>
                {summary.totalVariance > 0 ? '+' : ''}
                ${Math.abs(summary.totalVariance).toLocaleString()}
              </p>
            </div>
            <span className={`text-sm ${getVarianceColor(summary.totalVariance)}`}>
              {summary.totalVariancePercentage > 0 ? '+' : ''}
              {summary.totalVariancePercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="glassmorphic p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">On Track</p>
              <p className="text-lg font-semibold text-success">
                {summary.onTrackCategories}/{chartData.length}
              </p>
            </div>
            <InformationCircleIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="variance">Variance</option>
            <option value="name">Name</option>
            <option value="budgeted">Budgeted</option>
            <option value="actual">Actual</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTargets}
              onChange={(e) => {
                // This would need to be handled by parent component
                console.log('Show targets:', e.target.checked)
              }}
              className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-gray-400">Show targets</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTrends}
              onChange={(e) => {
                // This would need to be handled by parent component
                console.log('Show trends:', e.target.checked)
              }}
              className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-gray-400">Show trends</span>
          </label>
        </div>
      </div>

      {/* Chart */}
      <div className="min-h-[300px]">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ChartBarIcon className="w-12 h-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No Performance Data</h3>
            <p className="text-gray-400">
              Budget performance data will appear here once you have spending activity.
            </p>
          </div>
        ) : (
          <div>
            {chartType === 'bar' && renderBarChart()}
            {chartType === 'donut' && renderDonutChart()}
            {chartType === 'stacked' && renderStackedChart()}
          </div>
        )}
      </div>

      {/* Legend */}
      {chartData.length > 0 && chartType === 'donut' && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {chartData.map((item) => {
            const percentage = (item.actual / summary.totalActual) * 100
            return (
              <div
                key={item.label}
                className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                onClick={() => setSelectedCategory(
                  selectedCategory === item.label ? null : item.label
                )}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.label}</p>
                  <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}