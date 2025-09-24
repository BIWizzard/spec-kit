'use client'

import { useState } from 'react'

interface CashFlowDataPoint {
  date: string
  income: number
  expenses: number
  balance: number
  label: string
}

interface ChartProps {
  timeframe: '7d' | '30d' | '90d' | '1y'
  onTimeframeChange: (timeframe: '7d' | '30d' | '90d' | '1y') => void
}

function TimeframeSelector({ timeframe, onTimeframeChange }: ChartProps) {
  const options = [
    { value: '7d' as const, label: '7 Days' },
    { value: '30d' as const, label: '30 Days' },
    { value: '90d' as const, label: '3 Months' },
    { value: '1y' as const, label: '1 Year' }
  ]

  return (
    <div className="flex items-center gap-1 p-1 glass-card bg-glass-bg-light">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onTimeframeChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ${
            timeframe === option.value
              ? 'bg-kgiq-primary text-bg-primary shadow-md'
              : 'text-muted hover:text-primary hover:bg-glass-bg'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CashFlowChart({ data }: { data: CashFlowDataPoint[] }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expenses, d.balance)))
  const minValue = Math.min(...data.map(d => Math.min(d.income, d.expenses, d.balance, 0)))
  const range = maxValue - minValue

  const getY = (value: number) => {
    return 100 - ((value - minValue) / range) * 100
  }

  const generatePath = (values: number[]) => {
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100
        const y = getY(value)
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(' ')
  }

  return (
    <div className="h-80 relative">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid lines */}
        <defs>
          <pattern
            id="grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(255, 209, 102, 0.1)"
              strokeWidth="0.2"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Zero line if needed */}
        {minValue < 0 && (
          <line
            x1="0"
            y1={getY(0)}
            x2="100"
            y2={getY(0)}
            stroke="rgba(255, 209, 102, 0.3)"
            strokeWidth="0.3"
            strokeDasharray="2,2"
          />
        )}

        {/* Area fills */}
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(143, 173, 119)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(143, 173, 119)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(255, 209, 102)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(255, 209, 102)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Income area */}
        <path
          d={`${generatePath(data.map(d => d.income))} L 100 100 L 0 100 Z`}
          fill="url(#incomeGradient)"
        />

        {/* Expense area (from zero line) */}
        <path
          d={`${generatePath(data.map(d => d.expenses))} L 100 ${getY(0)} L 0 ${getY(0)} Z`}
          fill="url(#expenseGradient)"
        />

        {/* Lines */}
        <path
          d={generatePath(data.map(d => d.income))}
          fill="none"
          stroke="rgb(143, 173, 119)"
          strokeWidth="0.5"
          className="drop-shadow-sm"
        />

        <path
          d={generatePath(data.map(d => d.expenses))}
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="0.5"
          className="drop-shadow-sm"
        />

        <path
          d={generatePath(data.map(d => d.balance))}
          fill="none"
          stroke="rgb(255, 209, 102)"
          strokeWidth="0.8"
          className="drop-shadow-md"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={getY(point.income)}
                r="0.8"
                fill="rgb(143, 173, 119)"
                className="drop-shadow-sm"
              />
              <circle
                cx={x}
                cy={getY(point.expenses)}
                r="0.8"
                fill="rgb(239, 68, 68)"
                className="drop-shadow-sm"
              />
              <circle
                cx={x}
                cy={getY(point.balance)}
                r="1.2"
                fill="rgb(255, 209, 102)"
                className="drop-shadow-md"
              />
            </g>
          )
        })}
      </svg>

      {/* Date labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted px-2">
        {data.map((point, index) => (
          <span key={index} className="text-center">
            {point.label}
          </span>
        ))}
      </div>

      {/* Value labels */}
      <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-muted">
        <span>${(maxValue / 1000).toFixed(1)}k</span>
        <span>${((maxValue + minValue) / 2 / 1000).toFixed(1)}k</span>
        <span>${(minValue / 1000).toFixed(1)}k</span>
      </div>
    </div>
  )
}

function CashFlowLegend() {
  const items = [
    { color: 'rgb(143, 173, 119)', label: 'Income', icon: '💵' },
    { color: 'rgb(239, 68, 68)', label: 'Expenses', icon: '💸' },
    { color: 'rgb(255, 209, 102)', label: 'Balance', icon: '💰' }
  ]

  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">{item.icon}</span>
          </div>
          <span className="text-sm text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function CashFlowChart() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Mock data - in real app, this would come from API based on timeframe
  const cashFlowData: Record<string, CashFlowDataPoint[]> = {
    '7d': [
      { date: '2024-01-01', income: 800, expenses: 150, balance: 2850, label: 'Mon' },
      { date: '2024-01-02', income: 0, expenses: 220, balance: 2630, label: 'Tue' },
      { date: '2024-01-03', income: 1200, expenses: 180, balance: 3650, label: 'Wed' },
      { date: '2024-01-04', income: 0, expenses: 95, balance: 3555, label: 'Thu' },
      { date: '2024-01-05', income: 2800, expenses: 340, balance: 6015, label: 'Fri' },
      { date: '2024-01-06', income: 0, expenses: 450, balance: 5565, label: 'Sat' },
      { date: '2024-01-07', income: 0, expenses: 280, balance: 5285, label: 'Sun' }
    ],
    '30d': [
      { date: '2024-01-01', income: 5800, expenses: 1200, balance: 8450, label: 'Jan 1' },
      { date: '2024-01-05', income: 0, expenses: 850, balance: 7600, label: 'Jan 5' },
      { date: '2024-01-10', income: 2200, expenses: 1100, balance: 8700, label: 'Jan 10' },
      { date: '2024-01-15', income: 5800, expenses: 1350, balance: 13150, label: 'Jan 15' },
      { date: '2024-01-20', income: 0, expenses: 920, balance: 12230, label: 'Jan 20' },
      { date: '2024-01-25', income: 1500, expenses: 1180, balance: 12550, label: 'Jan 25' },
      { date: '2024-01-30', income: 0, expenses: 1050, balance: 11500, label: 'Jan 30' }
    ],
    '90d': [
      { date: '2023-11-01', income: 5800, expenses: 4200, balance: 6850, label: 'Nov' },
      { date: '2023-12-01', income: 6200, expenses: 4800, balance: 8250, label: 'Dec' },
      { date: '2024-01-01', income: 5800, expenses: 4100, balance: 9950, label: 'Jan' }
    ],
    '1y': [
      { date: '2023-02-01', income: 5200, expenses: 3800, balance: 4650, label: 'Feb' },
      { date: '2023-05-01', income: 5500, expenses: 4200, balance: 6950, label: 'May' },
      { date: '2023-08-01', income: 5800, expenses: 4500, balance: 8250, label: 'Aug' },
      { date: '2023-11-01', income: 6000, expenses: 4300, balance: 9950, label: 'Nov' },
      { date: '2024-01-01', income: 5800, expenses: 4100, balance: 11650, label: 'Jan' }
    ]
  }

  const currentData = cashFlowData[timeframe]
  const latestData = currentData[currentData.length - 1]
  const netCashFlow = latestData.income - latestData.expenses

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            📈 Cash Flow Analysis
          </h2>
          <p className="text-sm text-muted mt-1">Track your money in and money out</p>
        </div>

        <TimeframeSelector timeframe={timeframe} onTimeframeChange={setTimeframe} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 glass-card bg-glass-bg-light">
          <p className="text-2xl font-bold text-success">${latestData.income.toLocaleString()}</p>
          <p className="text-xs text-muted uppercase tracking-wide">Total Income</p>
        </div>
        <div className="text-center p-3 glass-card bg-glass-bg-light">
          <p className="text-2xl font-bold text-error">${latestData.expenses.toLocaleString()}</p>
          <p className="text-xs text-muted uppercase tracking-wide">Total Expenses</p>
        </div>
        <div className="text-center p-3 glass-card bg-glass-bg-light">
          <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-kgiq-primary' : 'text-error'}`}>
            ${Math.abs(netCashFlow).toLocaleString()}
          </p>
          <p className="text-xs text-muted uppercase tracking-wide">
            Net {netCashFlow >= 0 ? 'Positive' : 'Negative'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <CashFlowChart data={currentData} />
        <CashFlowLegend />
      </div>

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">📊</span>
          <span>Analytics powered by KGiQ Intelligence</span>
        </div>
        <div className="text-xs text-muted">
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </section>
  )
}