'use client'

interface MetricCardProps {
  title: string
  value: string
  change?: {
    amount: string
    percentage: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon: string
  color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error'
  subtitle?: string
}

function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    primary: 'border-kgiq-primary/30 bg-gradient-to-br from-kgiq-primary/10 to-transparent',
    secondary: 'border-kgiq-secondary/30 bg-gradient-to-br from-kgiq-secondary/10 to-transparent',
    tertiary: 'border-kgiq-tertiary/30 bg-gradient-to-br from-kgiq-tertiary/10 to-transparent',
    success: 'border-success/30 bg-gradient-to-br from-success/10 to-transparent',
    warning: 'border-warning/30 bg-gradient-to-br from-warning/10 to-transparent',
    error: 'border-error/30 bg-gradient-to-br from-error/10 to-transparent'
  }

  const iconColorClasses = {
    primary: 'text-kgiq-primary',
    secondary: 'text-kgiq-secondary',
    tertiary: 'text-kgiq-tertiary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗️'
      case 'down': return '↘️'
      default: return '→'
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-success'
      case 'down': return 'text-error'
      default: return 'text-muted'
    }
  }

  return (
    <div className={`glass-card p-6 ${colorClasses[color]} hover:shadow-glass-hover transition-all duration-300 group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-2xl ${iconColorClasses[color]} group-hover:scale-110 transition-transform duration-200`}>
              {icon}
            </div>
            <h3 className="text-muted text-sm font-medium uppercase tracking-wide">
              {title}
            </h3>
          </div>

          <div className="mb-2">
            <p className="text-primary text-2xl font-bold">
              {value}
            </p>
            {subtitle && (
              <p className="text-muted text-sm mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {change && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getTrendColor(change.trend)}`}>
                {getTrendIcon(change.trend)} {change.amount} ({change.percentage})
              </span>
              <span className="text-xs text-muted">vs last month</span>
            </div>
          )}
        </div>

        {/* KGiQ accent corner */}
        <div className="opacity-20 group-hover:opacity-40 transition-opacity duration-200">
          <div className={`w-2 h-2 rounded-full ${iconColorClasses[color].replace('text-', 'bg-')}`} />
        </div>
      </div>
    </div>
  )
}

export default function MetricsCards() {
  const metrics = [
    {
      title: 'Total Balance',
      value: '$12,450.32',
      change: {
        amount: '+$1,200.45',
        percentage: '+10.7%',
        trend: 'up' as const
      },
      icon: '💰',
      color: 'primary' as const,
      subtitle: 'Across all accounts'
    },
    {
      title: 'Monthly Income',
      value: '$5,800.00',
      change: {
        amount: '+$200.00',
        percentage: '+3.6%',
        trend: 'up' as const
      },
      icon: '💵',
      color: 'secondary' as const,
      subtitle: 'Expected this month'
    },
    {
      title: 'Monthly Expenses',
      value: '$4,250.00',
      change: {
        amount: '-$150.00',
        percentage: '-3.4%',
        trend: 'down' as const
      },
      icon: '📊',
      color: 'tertiary' as const,
      subtitle: 'Budgeted spending'
    },
    {
      title: 'Available Budget',
      value: '$1,550.00',
      change: {
        amount: '+$350.00',
        percentage: '+29.2%',
        trend: 'up' as const
      },
      icon: '🎯',
      color: 'success' as const,
      subtitle: 'Remaining this month'
    },
    {
      title: 'Upcoming Bills',
      value: '$850.00',
      change: {
        amount: '+$50.00',
        percentage: '+6.3%',
        trend: 'up' as const
      },
      icon: '📋',
      color: 'warning' as const,
      subtitle: 'Due in next 7 days'
    },
    {
      title: 'Savings Rate',
      value: '26.7%',
      change: {
        amount: '+2.3%',
        percentage: '+9.4%',
        trend: 'up' as const
      },
      icon: '🎁',
      color: 'primary' as const,
      subtitle: 'Of total income'
    }
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Financial Overview</h2>
          <p className="text-sm text-muted">Your family's current financial status</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span>Updated 5 min ago</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            color={metric.color}
            subtitle={metric.subtitle}
          />
        ))}
      </div>

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-center pt-4">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">⚡</span>
          <span>Metrics powered by KGiQ Intelligence</span>
        </div>
      </div>
    </section>
  )
}