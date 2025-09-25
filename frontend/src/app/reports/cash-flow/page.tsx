'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import CashFlowChart from '@/components/reports/cash-flow-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Download,
  Settings,
  Calendar,
  DollarSign,
  AlertCircle,
  Info
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface CashFlowData {
  date: string
  income: number
  expenses: number
  netFlow: number
  cumulativeFlow: number
}

// Mock data - in real app, this would come from API
const mockCashFlowData: CashFlowData[] = [
  {
    date: '2024-03-01',
    income: 3200,
    expenses: 2800,
    netFlow: 400,
    cumulativeFlow: 5400
  },
  {
    date: '2024-03-02',
    income: 0,
    expenses: 150,
    netFlow: -150,
    cumulativeFlow: 5250
  },
  {
    date: '2024-03-03',
    income: 0,
    expenses: 320,
    netFlow: -320,
    cumulativeFlow: 4930
  },
  {
    date: '2024-03-04',
    income: 0,
    expenses: 180,
    netFlow: -180,
    cumulativeFlow: 4750
  },
  {
    date: '2024-03-05',
    income: 450,
    expenses: 420,
    netFlow: 30,
    cumulativeFlow: 4780
  },
  {
    date: '2024-03-06',
    income: 0,
    expenses: 250,
    netFlow: -250,
    cumulativeFlow: 4530
  },
  {
    date: '2024-03-07',
    income: 0,
    expenses: 380,
    netFlow: -380,
    cumulativeFlow: 4150
  },
  {
    date: '2024-03-08',
    income: 0,
    expenses: 120,
    netFlow: -120,
    cumulativeFlow: 4030
  },
  {
    date: '2024-03-09',
    income: 0,
    expenses: 200,
    netFlow: -200,
    cumulativeFlow: 3830
  },
  {
    date: '2024-03-10',
    income: 0,
    expenses: 160,
    netFlow: -160,
    cumulativeFlow: 3670
  },
  {
    date: '2024-03-15',
    income: 3200,
    expenses: 1850,
    netFlow: 1350,
    cumulativeFlow: 5020
  },
  {
    date: '2024-03-16',
    income: 0,
    expenses: 340,
    netFlow: -340,
    cumulativeFlow: 4680
  },
  {
    date: '2024-03-17',
    income: 0,
    expenses: 280,
    netFlow: -280,
    cumulativeFlow: 4400
  },
  {
    date: '2024-03-18',
    income: 120,
    expenses: 220,
    netFlow: -100,
    cumulativeFlow: 4300
  },
  {
    date: '2024-03-19',
    income: 0,
    expenses: 190,
    netFlow: -190,
    cumulativeFlow: 4110
  }
]

export default function CashFlowReportPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
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
    // Simulate API call to fetch data for new period
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const handleExport = () => {
    console.log('Exporting cash flow report')
    // In real app, this would trigger report export
  }

  const totalIncome = mockCashFlowData.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = mockCashFlowData.reduce((sum, d) => sum + d.expenses, 0)
  const netFlow = totalIncome - totalExpenses
  const avgDailyFlow = netFlow / mockCashFlowData.length

  const insights = [
    {
      type: 'positive',
      title: 'Strong Income Days',
      description: 'You have consistent bi-weekly income events that boost your cash flow significantly.',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      type: 'warning',
      title: 'Daily Expense Pattern',
      description: 'Your daily expenses show regular outflows that could benefit from budgeting.',
      icon: <AlertCircle className="h-4 w-4" />
    },
    {
      type: 'info',
      title: 'Cash Flow Timing',
      description: 'Your lowest cash position occurs mid-cycle between income events.',
      icon: <Info className="h-4 w-4" />
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      {/* Header */}
      <Header user={user} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
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
                    <TrendingUp className="text-kgiq-primary text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Cash Flow Report
                    </h1>
                    <p className="text-muted text-lg">
                      Track income vs. expenses over time
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
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Income</p>
                      <p className="text-xl font-bold text-success">
                        ${totalIncome.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Expenses</p>
                      <p className="text-xl font-bold text-destructive">
                        ${totalExpenses.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      netFlow >= 0 ? 'bg-success/20' : 'bg-destructive/20'
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        netFlow >= 0 ? 'text-success' : 'text-destructive'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Net Flow</p>
                      <p className={`text-xl font-bold ${
                        netFlow >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        ${netFlow.toLocaleString()}
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
                      <p className="text-sm text-muted">Daily Average</p>
                      <p className={`text-xl font-bold ${
                        avgDailyFlow >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        ${avgDailyFlow.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Chart */}
            <Suspense fallback={<Loading message="Loading cash flow chart..." />}>
              <CashFlowChart
                data={mockCashFlowData}
                period={period}
                onPeriodChange={handlePeriodChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Insights and Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Insights */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Cash Flow Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg bg-glass-bg/30">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        insight.type === 'positive' ? 'bg-success/20 text-success' :
                        insight.type === 'warning' ? 'bg-warning/20 text-warning' :
                        'bg-info/20 text-info'
                      }`}>
                        {insight.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-primary mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Cash Flow Health Score */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Cash Flow Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${
                      netFlow >= 1000 ? 'text-success' :
                      netFlow >= 0 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {netFlow >= 1000 ? 'A+' :
                       netFlow >= 500 ? 'A' :
                       netFlow >= 0 ? 'B' :
                       netFlow >= -500 ? 'C' : 'D'}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-1 ${
                        netFlow >= 1000 ? 'text-success border-success' :
                        netFlow >= 0 ? 'text-warning border-warning' :
                        'text-destructive border-destructive'
                      }`}
                    >
                      {netFlow >= 1000 ? 'Excellent' :
                       netFlow >= 0 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Income Consistency</span>
                      <Badge variant="outline" className="text-success border-success">
                        High
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Expense Control</span>
                      <Badge variant="outline" className="text-warning border-warning">
                        Moderate
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Cash Reserves</span>
                      <Badge variant="outline" className="text-success border-success">
                        Healthy
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-glass-border/30">
                    <h4 className="font-medium text-primary mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted">
                      <li>• Monitor daily expense patterns</li>
                      <li>• Consider building emergency fund</li>
                      <li>• Track spending categories</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">💰</span>
                  <span>Powered by KGiQ Family Finance - Cash Flow Analysis</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Report period: {period}</span>
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