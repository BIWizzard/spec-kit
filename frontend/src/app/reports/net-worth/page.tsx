'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/header'
import Sidebar from '@/components/navigation/sidebar'
import NetWorthChart from '@/components/reports/net-worth-chart'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  ArrowLeft,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PieChart,
  Home,
  CreditCard,
  Briefcase
} from 'lucide-react'

interface User {
  name: string
  email: string
  role: string
  initials: string
}

interface NetWorthData {
  date: string
  assets: {
    total: number
    categories: Array<{
      name: string
      amount: number
      type: 'liquid' | 'investment' | 'property' | 'other'
      color: string
    }>
  }
  liabilities: {
    total: number
    categories: Array<{
      name: string
      amount: number
      type: 'credit' | 'loan' | 'mortgage' | 'other'
      color: string
    }>
  }
  netWorth: number
  change: number
  changePercentage: number
}

// Mock data - in real app, this would come from API
const mockNetWorthData: NetWorthData[] = [
  {
    date: '2024-01',
    assets: {
      total: 87500,
      categories: [
        { name: 'Savings Account', amount: 15000, type: 'liquid', color: '#8FAD77' },
        { name: 'Checking Account', amount: 3500, type: 'liquid', color: '#5E7F9B' },
        { name: '401(k)', amount: 45000, type: 'investment', color: '#FFD166' },
        { name: 'Home Equity', amount: 20000, type: 'property', color: '#E76F51' },
        { name: 'Investment Portfolio', amount: 4000, type: 'investment', color: '#F4A261' }
      ]
    },
    liabilities: {
      total: 45000,
      categories: [
        { name: 'Mortgage', amount: 35000, type: 'mortgage', color: '#264653' },
        { name: 'Credit Cards', amount: 5000, type: 'credit', color: '#E76F51' },
        { name: 'Car Loan', amount: 5000, type: 'loan', color: '#F4A261' }
      ]
    },
    netWorth: 42500,
    change: 0,
    changePercentage: 0
  },
  {
    date: '2024-02',
    assets: {
      total: 89200,
      categories: [
        { name: 'Savings Account', amount: 16000, type: 'liquid', color: '#8FAD77' },
        { name: 'Checking Account', amount: 3200, type: 'liquid', color: '#5E7F9B' },
        { name: '401(k)', amount: 46500, type: 'investment', color: '#FFD166' },
        { name: 'Home Equity', amount: 19000, type: 'property', color: '#E76F51' },
        { name: 'Investment Portfolio', amount: 4500, type: 'investment', color: '#F4A261' }
      ]
    },
    liabilities: {
      total: 44200,
      categories: [
        { name: 'Mortgage', amount: 34500, type: 'mortgage', color: '#264653' },
        { name: 'Credit Cards', amount: 4700, type: 'credit', color: '#E76F51' },
        { name: 'Car Loan', amount: 5000, type: 'loan', color: '#F4A261' }
      ]
    },
    netWorth: 45000,
    change: 2500,
    changePercentage: 5.9
  },
  {
    date: '2024-03',
    assets: {
      total: 91800,
      categories: [
        { name: 'Savings Account', amount: 17500, type: 'liquid', color: '#8FAD77' },
        { name: 'Checking Account', amount: 2800, type: 'liquid', color: '#5E7F9B' },
        { name: '401(k)', amount: 48000, type: 'investment', color: '#FFD166' },
        { name: 'Home Equity', amount: 18000, type: 'property', color: '#E76F51' },
        { name: 'Investment Portfolio', amount: 5500, type: 'investment', color: '#F4A261' }
      ]
    },
    liabilities: {
      total: 43400,
      categories: [
        { name: 'Mortgage', amount: 34000, type: 'mortgage', color: '#264653' },
        { name: 'Credit Cards', amount: 4400, type: 'credit', color: '#E76F51' },
        { name: 'Car Loan', amount: 5000, type: 'loan', color: '#F4A261' }
      ]
    },
    netWorth: 48400,
    change: 3400,
    changePercentage: 7.6
  }
]

export default function NetWorthReportPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [viewType, setViewType] = useState<'trend' | 'breakdown' | 'composition'>('trend')
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

  const handleViewChange = (newView: 'trend' | 'breakdown' | 'composition') => {
    setViewType(newView)
  }

  const handleExport = () => {
    console.log('Exporting net worth report')
  }

  const currentData = mockNetWorthData[mockNetWorthData.length - 1]
  const totalAssets = currentData.assets.total
  const totalLiabilities = currentData.liabilities.total
  const netWorth = currentData.netWorth
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
  const liquidAssets = currentData.assets.categories
    .filter(cat => cat.type === 'liquid')
    .reduce((sum, cat) => sum + cat.amount, 0)

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'liquid': return <Wallet className="h-4 w-4" />
      case 'investment': return <Briefcase className="h-4 w-4" />
      case 'property': return <Home className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getLiabilityTypeIcon = (type: string) => {
    switch (type) {
      case 'mortgage': return <Home className="h-4 w-4" />
      case 'credit': return <CreditCard className="h-4 w-4" />
      case 'loan': return <DollarSign className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const netWorthGrade = netWorth >= 100000 ? 'A+' :
                        netWorth >= 50000 ? 'A' :
                        netWorth >= 25000 ? 'B' :
                        netWorth >= 10000 ? 'C' : 'D'

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
                  <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center">
                    <DollarSign className="text-info text-2xl h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-1">
                      Net Worth Report
                    </h1>
                    <p className="text-muted text-lg">
                      Assets minus liabilities over time
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
                      <p className="text-sm text-muted">Total Assets</p>
                      <p className="text-xl font-bold text-success">
                        ${totalAssets.toLocaleString()}
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
                      <p className="text-sm text-muted">Total Liabilities</p>
                      <p className="text-xl font-bold text-destructive">
                        ${totalLiabilities.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      netWorth > 0 ? 'bg-info/20' : 'bg-destructive/20'
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        netWorth > 0 ? 'text-info' : 'text-destructive'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Net Worth</p>
                      <p className={`text-xl font-bold ${
                        netWorth > 0 ? 'text-info' : 'text-destructive'
                      }`}>
                        ${netWorth.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-glass-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentData.change > 0 ? 'bg-success/20' : 'bg-destructive/20'
                    }`}>
                      {currentData.change > 0 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted">Monthly Change</p>
                      <p className={`text-xl font-bold ${
                        currentData.change > 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {currentData.change > 0 ? '+' : ''}${currentData.change.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Net Worth Chart */}
            <Suspense fallback={<Loading message="Loading net worth chart..." />}>
              <NetWorthChart
                data={mockNetWorthData}
                period={period}
                viewType={viewType}
                onPeriodChange={handlePeriodChange}
                onViewChange={handleViewChange}
                isLoading={isLoading}
              />
            </Suspense>

            {/* Asset and Liability Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Assets Breakdown */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Assets Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentData.assets.categories
                    .sort((a, b) => b.amount - a.amount)
                    .map((asset, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center text-success">
                            {getAssetTypeIcon(asset.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-primary">{asset.name}</h4>
                            <p className="text-sm text-muted capitalize">{asset.type.replace('-', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-success">
                            ${asset.amount.toLocaleString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {((asset.amount / totalAssets) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

              {/* Liabilities Breakdown */}
              <Card className="glass-card border-glass-border/50">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Liabilities Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentData.liabilities.categories
                    .sort((a, b) => b.amount - a.amount)
                    .map((liability, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-glass-bg/30 flex items-center justify-center text-destructive">
                            {getLiabilityTypeIcon(liability.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-primary">{liability.name}</h4>
                            <p className="text-sm text-muted capitalize">{liability.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-destructive">
                            ${liability.amount.toLocaleString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {((liability.amount / totalLiabilities) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>

            </div>

            {/* Net Worth Health Assessment */}
            <Card className="glass-card border-glass-border/50">
              <CardHeader>
                <CardTitle className="text-primary">Net Worth Health Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Overall Score */}
                  <div className="text-center p-4">
                    <div className={`text-5xl font-bold mb-2 ${
                      netWorth >= 50000 ? 'text-success' :
                      netWorth >= 10000 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {netWorthGrade}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-1 ${
                        netWorth >= 50000 ? 'text-success border-success' :
                        netWorth >= 10000 ? 'text-warning border-warning' :
                        'text-destructive border-destructive'
                      }`}
                    >
                      {netWorth >= 50000 ? 'Excellent' :
                       netWorth >= 10000 ? 'Good' : 'Building'}
                    </Badge>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Debt-to-Asset Ratio</span>
                      <Badge
                        variant="outline"
                        className={debtToAssetRatio <= 30 ? 'text-success border-success' :
                                   debtToAssetRatio <= 50 ? 'text-warning border-warning' :
                                   'text-destructive border-destructive'}
                      >
                        {debtToAssetRatio.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Liquid Assets</span>
                      <Badge
                        variant="outline"
                        className="text-info border-info"
                      >
                        ${liquidAssets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Growth Trend</span>
                      <Badge
                        variant="outline"
                        className={currentData.change > 0 ? 'text-success border-success' : 'text-destructive border-destructive'}
                      >
                        {currentData.change > 0 ? 'Positive' : 'Negative'}
                      </Badge>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-medium text-primary mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted">
                      {debtToAssetRatio > 50 && (
                        <li>• Focus on debt reduction to improve ratio</li>
                      )}
                      {liquidAssets < 15000 && (
                        <li>• Build emergency fund (3-6 months expenses)</li>
                      )}
                      {currentData.change > 0 && (
                        <li>• Continue positive momentum with investments</li>
                      )}
                      <li>• Diversify asset portfolio for long-term growth</li>
                      <li>• Monitor net worth monthly for progress tracking</li>
                    </ul>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Footer Section */}
            <div className="glass-card p-4 border-glass-border/50">
              <div className="flex items-center justify-between text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-accent">💎</span>
                  <span>Powered by KGiQ Family Finance - Net Worth Analysis</span>
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