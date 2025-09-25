'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  isActive: boolean
}

interface ProjectionData {
  period: string
  date: string
  projected: number
  conservative: number
  optimistic: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

interface CategoryProjection {
  categoryId: string
  current: number
  monthlyTrend: number
  projections: ProjectionData[]
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

interface ProjectionsChartProps {
  categories: BudgetCategory[]
  projections: CategoryProjection[]
  timeHorizon: '3months' | '6months' | '1year' | '2years'
  onTimeHorizonChange: (horizon: '3months' | '6months' | '1year' | '2years') => void
  projectionType?: 'spending' | 'savings' | 'both'
  scenarioView?: 'realistic' | 'conservative' | 'optimistic' | 'all'
  showConfidenceBands?: boolean
  enableForecasting?: boolean
  className?: string
}

interface ChartPoint {
  x: number
  y: number
  period: string
  value: number
  confidence: number
}

const TIME_HORIZON_LABELS = {
  '3months': '3 Months',
  '6months': '6 Months',
  '1year': '1 Year',
  '2years': '2 Years'
}

const SCENARIO_COLORS = {
  conservative: '#8FAD77', // Sage green
  realistic: '#FFD166',    // Golden yellow
  optimistic: '#5E7F9B'    // Blue-gray
}

export default function ProjectionsChart({
  categories,
  projections,
  timeHorizon,
  onTimeHorizonChange,
  projectionType = 'spending',
  scenarioView = 'realistic',
  showConfidenceBands = true,
  enableForecasting = true,
  className = ''
}: ProjectionsChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showInsights, setShowInsights] = useState(true)

  // Generate chart data
  const chartData = useMemo(() => {
    if (!projections.length) return []

    const selectedProjection = selectedCategory
      ? projections.find(p => p.categoryId === selectedCategory)
      : null

    if (selectedProjection) {
      // Single category view
      return selectedProjection.projections.map((data, index) => ({
        x: index,
        period: data.period,
        conservative: data.conservative,
        realistic: data.projected,
        optimistic: data.optimistic,
        confidence: data.confidence,
        trend: data.trend
      }))
    } else {
      // All categories combined view
      const periods = projections[0]?.projections.map(p => p.period) || []

      return periods.map((period, index) => {
        const periodData = projections.reduce((acc, proj) => {
          const data = proj.projections.find(p => p.period === period)
          if (data) {
            acc.conservative += data.conservative
            acc.realistic += data.projected
            acc.optimistic += data.optimistic
            acc.totalConfidence += data.confidence
            acc.count++
          }
          return acc
        }, { conservative: 0, realistic: 0, optimistic: 0, totalConfidence: 0, count: 0 })

        return {
          x: index,
          period,
          conservative: periodData.conservative,
          realistic: periodData.realistic,
          optimistic: periodData.optimistic,
          confidence: periodData.count > 0 ? periodData.totalConfidence / periodData.count : 0,
          trend: 'stable' as const
        }
      })
    }
  }, [projections, selectedCategory])

  // Calculate insights
  const insights = useMemo(() => {
    if (!projections.length) return null

    const totalCurrent = projections.reduce((sum, proj) => sum + proj.current, 0)
    const avgGrowthRate = projections.reduce((sum, proj) => sum + proj.monthlyTrend, 0) / projections.length
    const highRiskCategories = projections.filter(proj => proj.riskLevel === 'high').length
    const projectedTotal = chartData.length > 0 ? chartData[chartData.length - 1]?.realistic || 0 : 0

    return {
      currentTotal: totalCurrent,
      projectedTotal,
      totalGrowth: projectedTotal - totalCurrent,
      growthRate: totalCurrent > 0 ? ((projectedTotal - totalCurrent) / totalCurrent) * 100 : 0,
      averageMonthlyGrowth: avgGrowthRate,
      highRiskCategories,
      timeToTarget: avgGrowthRate > 0 ? Math.ceil(12 / avgGrowthRate) : null
    }
  }, [projections, chartData])

  const renderLineChart = () => {
    if (!chartData.length) return null

    const maxValue = Math.max(
      ...chartData.flatMap(d => [d.conservative, d.realistic, d.optimistic])
    )
    const minValue = Math.min(
      ...chartData.flatMap(d => [d.conservative, d.realistic, d.optimistic])
    )

    const chartHeight = 300
    const chartWidth = 500
    const padding = 40

    const getY = (value: number) => {
      return chartHeight - padding - ((value - minValue) / (maxValue - minValue)) * (chartHeight - 2 * padding)
    }

    const getX = (index: number) => {
      return padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding)
    }

    const createPath = (dataKey: 'conservative' | 'realistic' | 'optimistic') => {
      return chartData.map((point, index) => {
        const x = getX(index)
        const y = getY(point[dataKey])
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      }).join(' ')
    }

    return (
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Grid Lines */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgb(75 85 99)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Confidence Bands */}
          {showConfidenceBands && (
            <path
              d={`${createPath('conservative')} ${createPath('optimistic').split(' ').reverse().join(' ')} Z`}
              fill="url(#confidenceGradient)"
              opacity="0.2"
            />
          )}

          {/* Scenario Lines */}
          {(scenarioView === 'all' || scenarioView === 'conservative') && (
            <path
              d={createPath('conservative')}
              stroke={SCENARIO_COLORS.conservative}
              strokeWidth="2"
              fill="none"
              className="transition-all duration-300"
            />
          )}

          {(scenarioView === 'all' || scenarioView === 'realistic') && (
            <path
              d={createPath('realistic')}
              stroke={SCENARIO_COLORS.realistic}
              strokeWidth="3"
              fill="none"
              className="transition-all duration-300"
            />
          )}

          {(scenarioView === 'all' || scenarioView === 'optimistic') && (
            <path
              d={createPath('optimistic')}
              stroke={SCENARIO_COLORS.optimistic}
              strokeWidth="2"
              fill="none"
              className="transition-all duration-300"
            />
          )}

          {/* Data Points */}
          {chartData.map((point, index) => (
            <g key={index}>
              {(scenarioView === 'all' || scenarioView === 'realistic') && (
                <circle
                  cx={getX(index)}
                  cy={getY(point.realistic)}
                  r="4"
                  fill={SCENARIO_COLORS.realistic}
                  className="cursor-pointer hover:r-6 transition-all"
                  onClick={() => setSelectedPeriod(point.period)}
                />
              )}

              {/* Confidence indicator */}
              <circle
                cx={getX(index)}
                cy={getY(point.realistic)}
                r={`${8 + point.confidence * 4}`}
                fill="none"
                stroke={SCENARIO_COLORS.realistic}
                strokeWidth="1"
                opacity="0.3"
              />
            </g>
          ))}

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor: SCENARIO_COLORS.realistic, stopOpacity: 0.3}} />
              <stop offset="100%" style={{stopColor: SCENARIO_COLORS.realistic, stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between mt-4 px-10">
          {chartData.map((point, index) => (
            <span
              key={index}
              className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors"
              onClick={() => setSelectedPeriod(point.period)}
            >
              {point.period}
            </span>
          ))}
        </div>

        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-10">
          <span className="text-xs text-gray-400">${maxValue.toLocaleString()}</span>
          <span className="text-xs text-gray-400">${((maxValue + minValue) / 2).toLocaleString()}</span>
          <span className="text-xs text-gray-400">${minValue.toLocaleString()}</span>
        </div>
      </div>
    )
  }

  const renderCategoryProjections = () => {
    return (
      <div className="space-y-4">
        {projections.map((projection) => {
          const category = categories.find(c => c.id === projection.categoryId)
          if (!category) return null

          const latestProjection = projection.projections[projection.projections.length - 1]
          const growthAmount = latestProjection ? latestProjection.projected - projection.current : 0
          const growthPercent = projection.current > 0 ? (growthAmount / projection.current) * 100 : 0

          return (
            <div
              key={projection.categoryId}
              className={`glassmorphic p-4 rounded-lg border border-white/10 cursor-pointer transition-all ${
                selectedCategory === projection.categoryId ? 'ring-2 ring-primary/50' : ''
              }`}
              onClick={() => setSelectedCategory(
                selectedCategory === projection.categoryId ? null : projection.categoryId
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h4 className="font-medium text-white">{category.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>Current: ${projection.current.toLocaleString()}</span>
                      {latestProjection && (
                        <>
                          <span>•</span>
                          <span>Projected: ${latestProjection.projected.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-1 ${
                    projection.riskLevel === 'high' ? 'text-error' :
                    projection.riskLevel === 'medium' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {projection.riskLevel === 'high' ? (
                      <ExclamationTriangleIcon className="w-4 h-4" />
                    ) : projection.riskLevel === 'medium' ? (
                      <InformationCircleIcon className="w-4 h-4" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                    <span className="text-xs capitalize">{projection.riskLevel} Risk</span>
                  </div>

                  {growthAmount !== 0 && (
                    <div className={`flex items-center space-x-1 ${
                      growthAmount > 0 ? 'text-warning' : 'text-success'
                    }`}>
                      {growthAmount > 0 ? (
                        <TrendingUpIcon className="w-4 h-4" />
                      ) : (
                        <TrendingDownIcon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {growthPercent > 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Trend Line */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Trend</span>
                  <span>{projection.monthlyTrend > 0 ? '+' : ''}{projection.monthlyTrend.toFixed(1)}% monthly</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      projection.monthlyTrend > 0 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{
                      width: `${Math.min(Math.abs(projection.monthlyTrend) * 10, 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Recommendations */}
              {projection.recommendations.length > 0 && (
                <div className="text-xs text-gray-400">
                  <span className="font-medium">Recommendation:</span>{' '}
                  {projection.recommendations[0]}
                </div>
              )}
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
          <TrendingUpIcon className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-white">Budget Projections</h3>
            <p className="text-sm text-gray-400">
              {TIME_HORIZON_LABELS[timeHorizon]} forecast • {projections.length} categories
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Scenario Selector */}
          <select
            value={scenarioView}
            onChange={(e) => {
              // This would need to be handled by parent component
              console.log('Scenario changed to:', e.target.value)
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="realistic">Realistic</option>
            <option value="conservative">Conservative</option>
            <option value="optimistic">Optimistic</option>
            <option value="all">All Scenarios</option>
          </select>

          {/* Time Horizon Selector */}
          <select
            value={timeHorizon}
            onChange={(e) => onTimeHorizonChange(e.target.value as any)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
            <option value="1year">1 Year</option>
            <option value="2years">2 Years</option>
          </select>

          {enableForecasting && (
            <button
              onClick={() => setIsCalculating(!isCalculating)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Recalculate projections"
            >
              <ArrowPathIcon className={`w-4 h-4 text-gray-400 ${isCalculating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Insights Summary */}
      {insights && showInsights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glassmorphic p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Current Total</p>
                <p className="text-lg font-semibold text-white">
                  ${insights.currentTotal.toLocaleString()}
                </p>
              </div>
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="glassmorphic p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Projected Total</p>
                <p className="text-lg font-semibold text-white">
                  ${insights.projectedTotal.toLocaleString()}
                </p>
              </div>
              <div className={`${insights.totalGrowth > 0 ? 'text-warning' : 'text-success'}`}>
                {insights.totalGrowth > 0 ? (
                  <TrendingUpIcon className="w-5 h-5" />
                ) : (
                  <TrendingDownIcon className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          <div className="glassmorphic p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Growth Rate</p>
                <p className={`text-lg font-semibold ${insights.growthRate > 0 ? 'text-warning' : 'text-success'}`}>
                  {insights.growthRate > 0 ? '+' : ''}{insights.growthRate.toFixed(1)}%
                </p>
              </div>
              <span className="text-sm text-gray-400">
                {insights.averageMonthlyGrowth.toFixed(1)}%/mo
              </span>
            </div>
          </div>

          <div className="glassmorphic p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Risk</p>
                <p className={`text-lg font-semibold ${
                  insights.highRiskCategories > 0 ? 'text-error' : 'text-success'
                }`}>
                  {insights.highRiskCategories}
                </p>
              </div>
              <ExclamationTriangleIcon className={`w-5 h-5 ${
                insights.highRiskCategories > 0 ? 'text-error' : 'text-gray-400'
              }`} />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              !selectedCategory
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Categories
          </button>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showConfidenceBands}
                onChange={(e) => {
                  // This would need to be handled by parent component
                  console.log('Show confidence bands:', e.target.checked)
                }}
                className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
              />
              <span className="text-sm text-gray-400">Confidence bands</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Legend:</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-sage-green" />
              <span className="text-xs text-gray-400">Conservative</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-primary" />
              <span className="text-xs text-gray-400">Realistic</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-0.5 bg-blue-gray" />
              <span className="text-xs text-gray-400">Optimistic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ChartBarIcon className="w-12 h-12 text-gray-500 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Projection Data</h3>
          <p className="text-gray-400">
            Budget projections will appear here once you have historical spending data.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Chart */}
          <div className="bg-black/20 rounded-lg p-4">
            {renderLineChart()}
          </div>

          {/* Category Details */}
          <div>
            <h4 className="text-sm font-medium text-white mb-4">Category Projections</h4>
            {renderCategoryProjections()}
          </div>
        </div>
      )}

      {/* Selected Period Details */}
      {selectedPeriod && (
        <div className="mt-6 glassmorphic p-4 rounded-lg border border-white/10">
          <h4 className="font-medium text-white mb-2">Period Details: {selectedPeriod}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* This would show detailed breakdown for selected period */}
          </div>
        </div>
      )}
    </div>
  )
}