'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import IncomeChart from '@/components/reports/income-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  ArrowLeft,
  Download,
  Settings,
  DollarSign,
  Target,
  Calendar,
  BarChart3,
  TrendingDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface IncomeData {
  period: string
  plannedIncome: number
  actualIncome: number
  variance: number
  variancePercentage: number
  sources: Array<{
    name: string
    amount: number
    percentage: number
    type: 'salary' | 'bonus' | 'side-hustle' | 'investment' | 'other'
  }>
  status: 'above' | 'below' | 'on-track'
}

// Mock data - in real app, this would come from API
const mockIncomeData: IncomeData[] = [
  {
    period: '2024-01',
    plannedIncome: 6400,
    actualIncome: 6400,
    variance: 0,
    variancePercentage: 0,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 81.3, type: 'salary' },
      { name: 'Freelance Work', amount: 800, percentage: 12.5, type: 'side-hustle' },
      { name: 'Investment Dividends', amount: 400, percentage: 6.3, type: 'investment' }
    ],
    status: 'on-track'
  },
  {
    period: '2024-02',
    plannedIncome: 6400,
    actualIncome: 6800,
    variance: 400,
    variancePercentage: 6.3,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 76.5, type: 'salary' },
      { name: 'Freelance Work', amount: 1200, percentage: 17.6, type: 'side-hustle' },
      { name: 'Investment Dividends', amount: 400, percentage: 5.9, type: 'investment' }
    ],
    status: 'above'
  },
  {
    period: '2024-03',
    plannedIncome: 6400,
    actualIncome: 5900,
    variance: -500,
    variancePercentage: -7.8,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 88.1, type: 'salary' },
      { name: 'Freelance Work', amount: 300, percentage: 5.1, type: 'side-hustle' },
      { name: 'Investment Dividends', amount: 400, percentage: 6.8, type: 'investment' }
    ],
    status: 'below'
  },
  {
    period: '2024-04',
    plannedIncome: 6400,
    actualIncome: 7200,
    variance: 800,
    variancePercentage: 12.5,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 72.2, type: 'salary' },
      { name: 'Freelance Work', amount: 1500, percentage: 20.8, type: 'side-hustle' },
      { name: 'Year-end Bonus', amount: 500, percentage: 6.9, type: 'bonus' }
    ],
    status: 'above'
  },
  {
    period: '2024-05',
    plannedIncome: 6400,
    actualIncome: 6100,
    variance: -300,
    variancePercentage: -4.7,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 85.2, type: 'salary' },
      { name: 'Freelance Work', amount: 500, percentage: 8.2, type: 'side-hustle' },
      { name: 'Investment Dividends', amount: 400, percentage: 6.6, type: 'investment' }
    ],
    status: 'on-track'
  },
  {
    period: '2024-06',
    plannedIncome: 6400,
    actualIncome: 6600,
    variance: 200,
    variancePercentage: 3.1,
    sources: [
      { name: 'Primary Salary', amount: 5200, percentage: 78.8, type: 'salary' },
      { name: 'Freelance Work', amount: 1000, percentage: 15.2, type: 'side-hustle' },
      { name: 'Investment Dividends', amount: 400, percentage: 6.1, type: 'investment' }
    ],
    status: 'above'
  }
]

export default function IncomeAnalysisPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [viewType, setViewType] = useState<'timeline' | 'sources' | 'variance'>('timeline')
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

  const handleViewChange = (newView: 'timeline' | 'sources' | 'variance') => {
    setViewType(newView)
  }

  const handleExport = () => {
    console.log('Exporting income analysis report')
  }

  const totalPlanned = mockIncomeData.reduce((sum, d) => sum + d.plannedIncome, 0)
  const totalActual = mockIncomeData.reduce((sum, d) => sum + d.actualIncome, 0)
  const totalVariance = totalActual - totalPlanned
  const avgMonthlyIncome = totalActual / mockIncomeData.length
  const consistencyScore = mockIncomeData.filter(d => Math.abs(d.variancePercentage) <= 10).length / mockIncomeData.length * 100

  // Consolidate income sources across all periods
  const allSources = mockIncomeData.flatMap(d => d.sources)
  const sourceMap = new Map()
  allSources.forEach(source => {
    const key = source.name
    if (sourceMap.has(key)) {
      sourceMap.get(key).amount += source.amount
    } else {
      sourceMap.set(key, { ...source })
    }
  })
  const consolidatedSources = Array.from(sourceMap.values())
    .sort((a, b) => b.amount - a.amount)

  const incomeInsights = [
    {
      type: 'growth',
      title: 'Income Growth',
      value: ((totalActual - totalPlanned) / totalPlanned * 100).toFixed(1) + '%',
      icon: <TrendingUp className="h-4 w-4" />,
      color: totalVariance > 0 ? 'text-success' : 'text-destructive'
    },
    {
      type: 'consistency',
      title: 'Income Consistency',
      value: consistencyScore.toFixed(0) + '%',
      icon: <Target className="h-4 w-4" />,
      color: consistencyScore >= 80 ? 'text-success' : consistencyScore >= 60 ? 'text-warning' : 'text-destructive'
    },
    {
      type: 'diversification',
      title: 'Income Sources',
      value: consolidatedSources.length.toString(),
      icon: <BarChart3 className="h-4 w-4" />,
      color: consolidatedSources.length >= 3 ? 'text-success' : 'text-warning'
    },
    {
      type: 'reliability',
      title: 'Reliable Sources',
      value: consolidatedSources.filter(s => s.type === 'salary').length.toString(),
      icon: <CheckCircle className="h-4 w-4" />,
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
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                    <TrendingUp className="text-warning text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Income Analysis
                    </h1>
                    <p className="text-muted text-lg">
                      Revenue sources and growth tracking
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
                      <p className="text-sm text-muted">Planned Income</p>
                      <p className="text-xl font-bold text-info">
                        ${totalPlanned.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Actual Income</p>
                      <p className="text-xl font-bold text-success">
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
                      totalVariance > 0 ? 'bg-success/20' : 'bg-destructive/20'
                    }`}>
                      <TrendingUp className={`h-5 w-5 ${
                        totalVariance > 0 ? 'text-success' : 'text-destructive'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Variance</p>
                      <p className={`text-xl font-bold ${
                        totalVariance > 0 ? 'text-success' : 'text-destructive'
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
                    <div className="w-10 h-10 rounded-full bg-kgiq-accent/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-kgiq-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Monthly Average</p>
                      <p className="text-xl font-bold text-kgiq-accent">
                        ${avgMonthlyIncome.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Income Chart */}
            <Suspense fallback={<Loading message="Loading income analysis..." />}>
              <IncomeChart
                data={mockIncomeData}
                period={period}
                viewType={viewType}
                onPeriodChange={handlePeriodChange}
                onViewChange={handleViewChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Analysis and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Income Insights */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Income Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {incomeInsights.map((insight, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center ${insight.color}`}>
                          {insight.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-primary">{insight.title}</h4>
                          <p className="text-sm text-muted">Performance metric</p>
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${insight.color}`}>
                        {insight.value}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Income Sources Breakdown */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Income Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {consolidatedSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-muted">#{index + 1}</span>
                          <div className={`w-3 h-3 rounded-full ${
                            source.type === 'salary' ? 'bg-success' :
                            source.type === 'bonus' ? 'bg-warning' :
                            source.type === 'side-hustle' ? 'bg-info' :
                            source.type === 'investment' ? 'bg-kgiq-primary' : 'bg-muted'
                          }`}></div>
                        </div>
                        <div>
                          <h4 className="font-medium text-primary">{source.name}</h4>
                          <p className="text-sm text-muted capitalize">{source.type.replace('-', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          ${source.amount.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {((source.amount / totalActual) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

            </div>

            {/* Income Health Score */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader>
                <CardTitle className="text-primary">Income Health Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Overall Score */}
                  <div className="text-center p-4">
                    <div className={`text-5xl font-bold mb-2 ${
                      consistencyScore >= 80 && totalVariance > 0 ? 'text-success' :
                      consistencyScore >= 60 || totalVariance > 0 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {consistencyScore >= 80 && totalVariance > 0 ? 'A+' :
                       consistencyScore >= 60 || totalVariance > 0 ? 'B' :
                       'C'}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-1 ${
                        consistencyScore >= 80 && totalVariance > 0 ? 'text-success border-success' :
                        consistencyScore >= 60 || totalVariance > 0 ? 'text-warning border-warning' :
                        'text-destructive border-destructive'
                      }`}
                    >
                      {consistencyScore >= 80 && totalVariance > 0 ? 'Excellent' :
                       consistencyScore >= 60 || totalVariance > 0 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Growth Trend</span>
                      <Badge
                        variant="outline"
                        className={totalVariance > 0 ? 'text-success border-success' : 'text-destructive border-destructive'}
                      >
                        {totalVariance > 0 ? 'Positive' : 'Negative'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Income Stability</span>
                      <Badge
                        variant="outline"
                        className={consistencyScore >= 80 ? 'text-success border-success' : 'text-warning border-warning'}
                      >
                        {consistencyScore >= 80 ? 'High' : 'Moderate'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Source Diversity</span>
                      <Badge
                        variant="outline"
                        className={consolidatedSources.length >= 3 ? 'text-success border-success' : 'text-warning border-warning'}
                      >
                        {consolidatedSources.length >= 3 ? 'Good' : 'Limited'}
                      </Badge>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-medium text-primary mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted">
                      {consolidatedSources.length < 3 && (
                        <li>• Diversify income sources for stability</li>
                      )}
                      {consistencyScore < 80 && (
                        <li>• Work on reducing income variability</li>
                      )}
                      {totalVariance < 0 && (
                        <li>• Focus on increasing reliable income streams</li>
                      )}
                      <li>• Consider automating savings from variable income</li>
                      <li>• Track income trends monthly for better planning</li>
                    </ul>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">💰</span>
                  <span>Powered by KGiQ Family Finance - Income Analysis</span>
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