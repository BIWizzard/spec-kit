'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import SpendingChart from '@/components/reports/spending-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PieChart,
  ArrowLeft,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface SpendingData {
  category: string
  amount: number
  percentage: number
  change: number
  budget?: number
  color: string
  subcategories?: Array<{
    name: string
    amount: number
    percentage: number
  }>
}

// Mock data - in real app, this would come from API
const mockSpendingData: SpendingData[] = [
  {
    category: 'Housing',
    amount: 1850,
    percentage: 47.4,
    change: 2.5,
    budget: 1800,
    color: '#FFD166',
    subcategories: [
      { name: 'Mortgage', amount: 1500, percentage: 81.1 },
      { name: 'Insurance', amount: 200, percentage: 10.8 },
      { name: 'Utilities', amount: 150, percentage: 8.1 }
    ]
  },
  {
    category: 'Food & Dining',
    amount: 680,
    percentage: 17.4,
    change: -5.2,
    budget: 750,
    color: '#8FAD77',
    subcategories: [
      { name: 'Groceries', amount: 450, percentage: 66.2 },
      { name: 'Restaurants', amount: 180, percentage: 26.5 },
      { name: 'Coffee', amount: 50, percentage: 7.4 }
    ]
  },
  {
    category: 'Transportation',
    amount: 520,
    percentage: 13.3,
    change: 8.7,
    budget: 450,
    color: '#5E7F9B',
    subcategories: [
      { name: 'Car Payment', amount: 350, percentage: 67.3 },
      { name: 'Gas', amount: 120, percentage: 23.1 },
      { name: 'Maintenance', amount: 50, percentage: 9.6 }
    ]
  },
  {
    category: 'Entertainment',
    amount: 280,
    percentage: 7.2,
    change: 15.3,
    budget: 200,
    color: '#E76F51',
    subcategories: [
      { name: 'Streaming Services', amount: 80, percentage: 28.6 },
      { name: 'Movies & Events', amount: 120, percentage: 42.9 },
      { name: 'Hobbies', amount: 80, percentage: 28.6 }
    ]
  },
  {
    category: 'Shopping',
    amount: 320,
    percentage: 8.2,
    change: -12.1,
    budget: 400,
    color: '#F4A261',
    subcategories: [
      { name: 'Clothing', amount: 180, percentage: 56.3 },
      { name: 'Electronics', amount: 100, percentage: 31.3 },
      { name: 'Home Goods', amount: 40, percentage: 12.5 }
    ]
  },
  {
    category: 'Health & Fitness',
    amount: 240,
    percentage: 6.1,
    change: 3.2,
    budget: 300,
    color: '#2A9D8F',
    subcategories: [
      { name: 'Gym Membership', amount: 80, percentage: 33.3 },
      { name: 'Medical', amount: 120, percentage: 50.0 },
      { name: 'Supplements', amount: 40, percentage: 16.7 }
    ]
  }
]

export default function SpendingAnalysisPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [viewType, setViewType] = useState<'pie' | 'bar' | 'breakdown'>('pie')
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

  const handleViewChange = (newView: 'pie' | 'bar' | 'breakdown') => {
    setViewType(newView)
  }

  const handleExport = () => {
    console.log('Exporting spending analysis report')
    // In real app, this would trigger report export
  }

  const totalSpending = mockSpendingData.reduce((sum, d) => sum + d.amount, 0)
  const totalBudget = mockSpendingData.reduce((sum, d) => sum + (d.budget || 0), 0)
  const overBudgetCategories = mockSpendingData.filter(d => d.budget && d.amount > d.budget)
  const underBudgetCategories = mockSpendingData.filter(d => d.budget && d.amount <= d.budget * 0.8)
  const budgetUtilization = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0

  const categoryInsights = [
    {
      type: 'over-budget',
      categories: overBudgetCategories,
      title: 'Over Budget Categories',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-destructive'
    },
    {
      type: 'under-budget',
      categories: underBudgetCategories,
      title: 'Under Budget Categories',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-success'
    },
    {
      type: 'trending-up',
      categories: mockSpendingData.filter(d => d.change > 10),
      title: 'Increasing Spend',
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-warning'
    },
    {
      type: 'trending-down',
      categories: mockSpendingData.filter(d => d.change < -10),
      title: 'Decreasing Spend',
      icon: <TrendingDown className="h-4 w-4" />,
      color: 'text-success'
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
                  <div className="w-12 h-12 rounded-full bg-kgiq-accent/20 flex items-center justify-center">
                    <PieChart className="text-kgiq-accent text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Spending Analysis
                    </h1>
                    <p className="text-muted text-lg">
                      Category breakdown and spending trends
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
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Total Spent</p>
                      <p className="text-xl font-bold text-primary">
                        ${totalSpending.toLocaleString()}
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
                      <p className="text-sm text-muted">Total Budget</p>
                      <p className="text-xl font-bold text-info">
                        ${totalBudget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      budgetUtilization > 100 ? 'bg-destructive/20' :
                      budgetUtilization > 80 ? 'bg-warning/20' : 'bg-success/20'
                    }`}>
                      <Target className={`h-5 w-5 ${
                        budgetUtilization > 100 ? 'text-destructive' :
                        budgetUtilization > 80 ? 'text-warning' : 'text-success'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Budget Usage</p>
                      <p className={`text-xl font-bold ${
                        budgetUtilization > 100 ? 'text-destructive' :
                        budgetUtilization > 80 ? 'text-warning' : 'text-success'
                      }`}>
                        {budgetUtilization.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      overBudgetCategories.length > 0 ? 'bg-destructive/20' : 'bg-success/20'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        overBudgetCategories.length > 0 ? 'text-destructive' : 'text-success'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Over Budget</p>
                      <p className={`text-xl font-bold ${
                        overBudgetCategories.length > 0 ? 'text-destructive' : 'text-success'
                      }`}>
                        {overBudgetCategories.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Spending Chart */}
            <Suspense fallback={<Loading message="Loading spending chart..." />}>
              <SpendingChart
                data={mockSpendingData}
                period={period}
                viewType={viewType}
                onPeriodChange={handlePeriodChange}
                onViewChange={handleViewChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Category Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Category Status Breakdown */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Category Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryInsights.map((insight, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center ${insight.color}`}>
                          {insight.icon}
                        </div>
                        <h4 className="font-medium text-primary">{insight.title}</h4>
                      </div>
                      {insight.categories.length > 0 ? (
                        <div className="ml-10 space-y-1">
                          {insight.categories.map((category, catIndex) => (
                            <div key={catIndex} className="flex justify-between items-center p-2 rounded bg-glass-bg/20">
                              <span className="text-sm text-muted">{category.category}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-primary">
                                  ${category.amount.toLocaleString()}
                                </span>
                                {category.budget && (
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    {((category.amount / category.budget) * 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-10 text-sm text-muted italic">
                          No categories in this status
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Spending Categories */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary">Top Spending Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockSpendingData
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5)
                    .map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-muted">#{index + 1}</span>
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                          </div>
                          <div>
                            <h4 className="font-medium text-primary">{category.category}</h4>
                            <p className="text-sm text-muted">{category.percentage.toFixed(1)}% of total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            ${category.amount.toLocaleString()}
                          </div>
                          <div className={`text-sm flex items-center gap-1 ${
                            category.change > 0 ? 'text-destructive' : 'text-success'
                          }`}>
                            {category.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(category.change).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

            </div>

            {/* Recommendations */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Smart Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgetUtilization > 100 && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <h4 className="font-medium text-destructive mb-2">Budget Exceeded</h4>
                      <p className="text-sm text-muted">
                        You've exceeded your total budget by ${(totalSpending - totalBudget).toLocaleString()}.
                        Consider reviewing {overBudgetCategories.length} over-budget categories.
                      </p>
                    </div>
                  )}

                  {overBudgetCategories.includes(mockSpendingData.find(d => d.category === 'Entertainment')!) && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <h4 className="font-medium text-warning mb-2">Entertainment Spending High</h4>
                      <p className="text-sm text-muted">
                        Entertainment spending is 40% over budget. Consider setting limits on discretionary spending.
                      </p>
                    </div>
                  )}

                  {underBudgetCategories.length > 0 && (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <h4 className="font-medium text-success mb-2">Savings Opportunity</h4>
                      <p className="text-sm text-muted">
                        You're under budget in {underBudgetCategories.length} categories.
                        Consider allocating savings to emergency fund or debt reduction.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">📊</span>
                  <span>Powered by KGiQ Family Finance - Spending Analysis</span>
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