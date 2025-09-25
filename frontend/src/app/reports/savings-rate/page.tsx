'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import SavingsChart from '@/components/reports/savings-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PiggyBank,
  ArrowLeft,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Wallet,
  Calendar,
  BarChart3
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface SavingsData {
  period: string
  income: number
  expenses: number
  savings: number
  savingsRate: number
  target: number
  targetRate: number
  categories: Array<{
    name: string
    amount: number
    type: 'emergency' | 'retirement' | 'goals' | 'investment'
    color: string
  }>
}

// Mock data - in real app, this would come from API
const mockSavingsData: SavingsData[] = [
  {
    period: '2024-01',
    income: 8500,
    expenses: 6800,
    savings: 1700,
    savingsRate: 20.0,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 850, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 510, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 170, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 170, type: 'investment', color: '#E76F51' }
    ]
  },
  {
    period: '2024-02',
    income: 8500,
    expenses: 7100,
    savings: 1400,
    savingsRate: 16.5,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 700, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 425, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 140, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 135, type: 'investment', color: '#E76F51' }
    ]
  },
  {
    period: '2024-03',
    income: 8500,
    expenses: 6500,
    savings: 2000,
    savingsRate: 23.5,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 1000, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 600, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 200, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 200, type: 'investment', color: '#E76F51' }
    ]
  },
  {
    period: '2024-04',
    income: 8500,
    expenses: 6600,
    savings: 1900,
    savingsRate: 22.4,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 950, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 570, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 190, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 190, type: 'investment', color: '#E76F51' }
    ]
  },
  {
    period: '2024-05',
    income: 8500,
    expenses: 6900,
    savings: 1600,
    savingsRate: 18.8,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 800, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 480, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 160, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 160, type: 'investment', color: '#E76F51' }
    ]
  },
  {
    period: '2024-06',
    income: 8500,
    expenses: 6400,
    savings: 2100,
    savingsRate: 24.7,
    target: 1700,
    targetRate: 20.0,
    categories: [
      { name: 'Emergency Fund', amount: 1050, type: 'emergency', color: '#8FAD77' },
      { name: '401(k)', amount: 630, type: 'retirement', color: '#FFD166' },
      { name: 'Vacation Fund', amount: 210, type: 'goals', color: '#5E7F9B' },
      { name: 'Investment Account', amount: 210, type: 'investment', color: '#E76F51' }
    ]
  }
]

export default function SavingsRateReportPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [viewType, setViewType] = useState<'rate' | 'amount' | 'goals' | 'projection'>('rate')
  const [isLoading, setIsLoading] = useState(false)

  // Mock user data - in real app, this would come from auth context
  const user: User = {
    name: 'Sarah Johnson',
    email: 'sarah@johnson-family.com',
    role: 'Administrator',
    initials: 'SJ'
  }

  const handlePeriodChange = async (newPeriod: 'month' | 'quarter' | 'year') => {
    setIsLoading(true)
    setPeriod(newPeriod)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const handleViewChange = (newView: 'rate' | 'amount' | 'goals' | 'projection') => {
    setViewType(newView)
  }

  const handleExport = () => {
    console.log('Exporting savings rate report')
  }

  const currentData = mockSavingsData[mockSavingsData.length - 1]
  const totalSavings = mockSavingsData.reduce((sum, data) => sum + data.savings, 0)
  const avgSavingsRate = mockSavingsData.reduce((sum, data) => sum + data.savingsRate, 0) / mockSavingsData.length
  const periodsOnTarget = mockSavingsData.filter(data => data.savingsRate >= data.targetRate).length
  const targetHitRate = (periodsOnTarget / mockSavingsData.length) * 100

  // Calculate trend (last 3 months)
  const recentData = mockSavingsData.slice(-3)
  const trend = recentData.length >= 2
    ? recentData[recentData.length - 1].savingsRate - recentData[0].savingsRate
    : 0

  const getSavingsGrade = (rate: number) => {
    if (rate >= 25) return 'A+'
    if (rate >= 20) return 'A'
    if (rate >= 15) return 'B'
    if (rate >= 10) return 'C'
    return 'D'
  }

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertCircle className="h-4 w-4" />
      case 'retirement': return <Calendar className="h-4 w-4" />
      case 'goals': return <Target className="h-4 w-4" />
      case 'investment': return <BarChart3 className="h-4 w-4" />
      default: return <Wallet className="h-4 w-4" />
    }
  }

  const savingsGrade = getSavingsGrade(currentData.savingsRate)
  const monthlyTrend = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'stable'

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
                  <div className="w-12 h-12 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                    <PiggyBank className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Savings Rate Report
                    </h1>
                    <p className="text-muted text-lg">
                      Track your savings performance and build wealth over time
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentData.savingsRate >= currentData.targetRate ? 'bg-success/20' : 'bg-warning/20'
                    }`}>
                      <Percent className={`h-5 w-5 ${
                        currentData.savingsRate >= currentData.targetRate ? 'text-success' : 'text-warning'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Current Rate</p>
                      <p className={`text-xl font-bold ${
                        currentData.savingsRate >= currentData.targetRate ? 'text-success' : 'text-warning'
                      }`}>
                        {currentData.savingsRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Target Rate</p>
                      <p className="text-xl font-bold text-info">
                        {currentData.targetRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kgiq-primary/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-kgiq-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">This Month</p>
                      <p className="text-xl font-bold text-kgiq-primary">
                        ${currentData.savings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trend > 0 ? 'bg-success/20' : trend < 0 ? 'bg-destructive/20' : 'bg-muted/20'
                    }`}>
                      {trend > 0 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : trend < 0 ? (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      ) : (
                        <Target className="h-5 w-5 text-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted">3-Month Trend</p>
                      <p className={`text-xl font-bold ${
                        trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted'
                      }`}>
                        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Savings Rate Chart */}
            <Suspense fallback={<Loading message="Loading savings rate chart..." />}>
              <SavingsChart
                data={mockSavingsData}
                period={period}
                viewType={viewType}
                onPeriodChange={handlePeriodChange}
                onViewChange={handleViewChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Savings Performance */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-glass-bg/30">
                      <div className={`text-4xl font-bold mb-2 ${
                        avgSavingsRate >= 20 ? 'text-success' :
                        avgSavingsRate >= 15 ? 'text-warning' :
                        'text-destructive'
                      }`}>
                        {savingsGrade}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-sm px-3 py-1 ${
                          avgSavingsRate >= 20 ? 'text-success border-success' :
                          avgSavingsRate >= 15 ? 'text-warning border-warning' :
                          'text-destructive border-destructive'
                        }`}
                      >
                        {avgSavingsRate >= 20 ? 'Excellent' :
                         avgSavingsRate >= 15 ? 'Good' :
                         avgSavingsRate >= 10 ? 'Fair' : 'Needs Work'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted">Average Rate</span>
                        <span className="text-sm font-medium text-primary">
                          {avgSavingsRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted">Target Hit Rate</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            targetHitRate >= 80 ? 'text-success border-success' :
                            targetHitRate >= 60 ? 'text-warning border-warning' :
                            'text-destructive border-destructive'
                          }`}
                        >
                          {targetHitRate.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted">Total Saved</span>
                        <span className="text-sm font-medium text-kgiq-primary">
                          ${totalSavings.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted">Periods Tracked</span>
                        <span className="text-sm font-medium text-primary">
                          {mockSavingsData.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Savings Categories */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <PiggyBank className="h-5 w-5" />
                    Current Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentData.categories
                    .sort((a, b) => b.amount - a.amount)
                    .map((category, index) => {
                      const percentage = (category.amount / currentData.savings) * 100

                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center"
                                 style={{ color: category.color }}>
                              {getCategoryIcon(category.type)}
                            </div>
                            <div>
                              <h4 className="font-medium text-primary">{category.name}</h4>
                              <p className="text-sm text-muted capitalize">{category.type.replace('-', ' ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-kgiq-primary">
                              ${category.amount.toLocaleString()}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                </CardContent>
              </Card>

            </div>

            {/* Savings Health Assessment */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader>
                <CardTitle className="text-primary">Savings Rate Health Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Current Status */}
                  <div className="text-center p-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      currentData.savingsRate >= currentData.targetRate ? 'bg-success/20' : 'bg-warning/20'
                    }`}>
                      {currentData.savingsRate >= currentData.targetRate ? (
                        <CheckCircle className="h-8 w-8 text-success" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-warning" />
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-2 ${
                        currentData.savingsRate >= currentData.targetRate ? 'text-success border-success' :
                        currentData.savingsRate >= currentData.targetRate * 0.8 ? 'text-warning border-warning' :
                        'text-destructive border-destructive'
                      }`}
                    >
                      {currentData.savingsRate >= currentData.targetRate ? 'On Track' :
                       currentData.savingsRate >= currentData.targetRate * 0.8 ? 'Close' : 'Behind Target'}
                    </Badge>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Emergency Fund</span>
                      <Badge
                        variant="outline"
                        className="text-kgiq-sage border-kgiq-sage"
                      >
                        ${currentData.categories.find(c => c.type === 'emergency')?.amount.toLocaleString() || '0'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Retirement Savings</span>
                      <Badge
                        variant="outline"
                        className="text-kgiq-primary border-kgiq-primary"
                      >
                        ${currentData.categories.find(c => c.type === 'retirement')?.amount.toLocaleString() || '0'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Goal Progress</span>
                      <Badge
                        variant="outline"
                        className="text-info border-info"
                      >
                        ${currentData.categories.find(c => c.type === 'goals')?.amount.toLocaleString() || '0'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Investment Growth</span>
                      <Badge
                        variant="outline"
                        className="text-warning border-warning"
                      >
                        ${currentData.categories.find(c => c.type === 'investment')?.amount.toLocaleString() || '0'}
                      </Badge>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-medium text-primary mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted">
                      {currentData.savingsRate < currentData.targetRate && (
                        <li>• Increase savings rate to reach {currentData.targetRate}% target</li>
                      )}
                      {currentData.categories.find(c => c.type === 'emergency')?.amount && currentData.categories.find(c => c.type === 'emergency')!.amount < 10000 && (
                        <li>• Build emergency fund to 3-6 months of expenses</li>
                      )}
                      {trend < 0 && (
                        <li>• Review expenses to reverse declining savings trend</li>
                      )}
                      {currentData.savingsRate >= 20 && (
                        <li>• Excellent savings rate! Consider increasing investments</li>
                      )}
                      <li>• Automate savings to maintain consistent progress</li>
                      <li>• Review allocation quarterly for optimal balance</li>
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
                  <span>Powered by KGiQ Family Finance - Savings Rate Analysis</span>
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