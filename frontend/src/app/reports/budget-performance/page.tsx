'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import BudgetPerformanceChart from '@/components/reports/budget-performance-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  ArrowLeft,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface BudgetPerformanceData {
  categoryId: string
  categoryName: string
  budgeted: number
  actual: number
  variance: number
  variancePercentage: number
  status: 'under' | 'over' | 'on-track'
  color: string
  trend?: 'improving' | 'worsening' | 'stable'
}

// Mock data - in real app, this would come from API
const mockBudgetData: BudgetPerformanceData[] = [
  {
    categoryId: '1',
    categoryName: 'Housing',
    budgeted: 1800,
    actual: 1850,
    variance: 50,
    variancePercentage: 2.8,
    status: 'over',
    color: '#FFD166',
    trend: 'stable'
  },
  {
    categoryId: '2',
    categoryName: 'Food & Dining',
    budgeted: 750,
    actual: 680,
    variance: -70,
    variancePercentage: -9.3,
    status: 'under',
    color: '#8FAD77',
    trend: 'improving'
  },
  {
    categoryId: '3',
    categoryName: 'Transportation',
    budgeted: 450,
    actual: 520,
    variance: 70,
    variancePercentage: 15.6,
    status: 'over',
    color: '#5E7F9B',
    trend: 'worsening'
  },
  {
    categoryId: '4',
    categoryName: 'Entertainment',
    budgeted: 200,
    actual: 280,
    variance: 80,
    variancePercentage: 40.0,
    status: 'over',
    color: '#E76F51',
    trend: 'worsening'
  },
  {
    categoryId: '5',
    categoryName: 'Shopping',
    budgeted: 400,
    actual: 320,
    variance: -80,
    variancePercentage: -20.0,
    status: 'under',
    color: '#F4A261',
    trend: 'improving'
  },
  {
    categoryId: '6',
    categoryName: 'Health & Fitness',
    budgeted: 300,
    actual: 290,
    variance: -10,
    variancePercentage: -3.3,
    status: 'on-track',
    color: '#2A9D8F',
    trend: 'stable'
  },
  {
    categoryId: '7',
    categoryName: 'Savings',
    budgeted: 800,
    actual: 750,
    variance: -50,
    variancePercentage: -6.3,
    status: 'under',
    color: '#264653',
    trend: 'stable'
  }
]

export default function BudgetPerformanceReportPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [viewType, setViewType] = useState<'variance' | 'utilization' | 'trend'>('variance')
  const [isLoading, setIsLoading] = useState(false)

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const handlePeriodChange = async (newPeriod: 'week' | 'month' | 'quarter' | 'year') => {
    setIsLoading(true)
    setPeriod(newPeriod)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const handleViewChange = (newView: 'variance' | 'utilization' | 'trend') => {
    setViewType(newView)
  }

  const handleExport = () => {
    console.log('Exporting budget performance report')
  }

  const totalBudgeted = mockBudgetData.reduce((sum, d) => sum + d.budgeted, 0)
  const totalActual = mockBudgetData.reduce((sum, d) => sum + d.actual, 0)
  const totalVariance = totalActual - totalBudgeted
  const overBudgetCategories = mockBudgetData.filter(d => d.status === 'over')
  const underBudgetCategories = mockBudgetData.filter(d => d.status === 'under')
  const onTrackCategories = mockBudgetData.filter(d => d.status === 'on-track')
  const utilizationRate = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0

  const performanceInsights = [
    {
      type: 'over-budget',
      title: 'Over Budget Categories',
      count: overBudgetCategories.length,
      amount: overBudgetCategories.reduce((sum, cat) => sum + cat.variance, 0),
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-destructive'
    },
    {
      type: 'under-budget',
      title: 'Under Budget Categories',
      count: underBudgetCategories.length,
      amount: Math.abs(underBudgetCategories.reduce((sum, cat) => sum + cat.variance, 0)),
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success'
    },
    {
      type: 'worsening',
      title: 'Worsening Trends',
      count: mockBudgetData.filter(d => d.trend === 'worsening').length,
      icon: <TrendingDown className="h-4 w-4" />,
      color: 'text-warning'
    },
    {
      type: 'improving',
      title: 'Improving Trends',
      count: mockBudgetData.filter(d => d.trend === 'improving').length,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-success'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <Header user={user} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6 ml-[280px]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header Section */}
            <div className="glass-card p-6 border-kgiq-primary/20 bg-gradient-to-r from-glass-bg to-glass-bg-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-button"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Target className="text-success text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Budget Performance
                    </h1>
                    <p className="text-muted text-lg">
                      Target vs. actual spending analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="glass-button"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    className="glass-button"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Budget</p>
                      <p className="text-xl font-bold text-info">
                        ${totalBudgeted.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Actual Spend</p>
                      <p className="text-xl font-bold text-primary">
                        ${totalActual.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      totalVariance > 0 ? 'bg-destructive/20' : 'bg-success/20'
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        totalVariance > 0 ? 'text-destructive' : 'text-success'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Variance</p>
                      <p className={`text-xl font-bold ${
                        totalVariance > 0 ? 'text-destructive' : 'text-success'
                      }`}>
                        {totalVariance > 0 ? '+' : ''}${totalVariance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      utilizationRate > 100 ? 'bg-destructive/20' :
                      utilizationRate > 90 ? 'bg-warning/20' : 'bg-success/20'
                    }`}>
                      <Target className={`h-5 w-5 ${
                        utilizationRate > 100 ? 'text-destructive' :
                        utilizationRate > 90 ? 'text-warning' : 'text-success'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Utilization</p>
                      <p className={`text-xl font-bold ${
                        utilizationRate > 100 ? 'text-destructive' :
                        utilizationRate > 90 ? 'text-warning' : 'text-success'
                      }`}>
                        {utilizationRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Performance Chart */}
            <Suspense fallback={<Loading message="Loading budget performance chart..." />}>
              <BudgetPerformanceChart
                data={mockBudgetData}
                period={period}
                viewType={viewType}
                onPeriodChange={handlePeriodChange}
                onViewChange={handleViewChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Performance Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Performance Insights */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Performance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {performanceInsights.map((insight, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center ${insight.color}`}>
                          {insight.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-primary">{insight.title}</h4>
                          <p className="text-sm text-muted">
                            {insight.count} {insight.count === 1 ? 'category' : 'categories'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {insight.type === 'over-budget' || insight.type === 'under-budget' ? (
                          <div className={`text-lg font-bold ${insight.color}`}>
                            ${insight.amount.toLocaleString()}
                          </div>
                        ) : (
                          <div className={`text-lg font-bold ${insight.color}`}>
                            {insight.count}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Budget Health Score */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Budget Health Score</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${
                      utilizationRate <= 90 ? 'text-success' :
                      utilizationRate <= 100 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {utilizationRate <= 80 ? 'A+' :
                       utilizationRate <= 90 ? 'A' :
                       utilizationRate <= 100 ? 'B' :
                       utilizationRate <= 110 ? 'C' : 'D'}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-1 ${
                        utilizationRate <= 90 ? 'text-success border-success' :
                        utilizationRate <= 100 ? 'text-warning border-warning' :
                        'text-destructive border-destructive'
                      }`}
                    >
                      {utilizationRate <= 90 ? 'Excellent' :
                       utilizationRate <= 100 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Budget Adherence</span>
                      <Badge
                        variant="outline"
                        className={utilizationRate <= 100 ? 'text-success border-success' : 'text-destructive border-destructive'}
                      >
                        {utilizationRate <= 100 ? 'On Track' : 'Over Budget'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Categories On Track</span>
                      <Badge variant="outline" className="text-info border-info">
                        {onTrackCategories.length} of {mockBudgetData.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Spending Control</span>
                      <Badge
                        variant="outline"
                        className={overBudgetCategories.length <= 1 ? 'text-success border-success' : 'text-warning border-warning'}
                      >
                        {overBudgetCategories.length <= 1 ? 'Good' : 'Needs Attention'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-glass-border/30">
                    <h4 className="font-medium text-primary mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted">
                      {utilizationRate > 100 && (
                        <li>• Reduce spending in over-budget categories</li>
                      )}
                      {overBudgetCategories.length > 2 && (
                        <li>• Review budgets for {overBudgetCategories.length} categories</li>
                      )}
                      {underBudgetCategories.length > 0 && (
                        <li>• Consider reallocating savings to debt or investments</li>
                      )}
                      <li>• Set up alerts for categories approaching limits</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">🎯</span>
                  <span>Powered by KGiQ Family Finance - Budget Performance Analysis</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>View: {viewType}</span>
                  <span>Period: {period}</span>
                  <span>Generated: {new Date().toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-success">Live</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}