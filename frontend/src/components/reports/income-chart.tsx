'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Target } from 'lucide-react';

interface IncomeData {
  period: string;
  plannedIncome: number;
  actualIncome: number;
  variance: number;
  variancePercentage: number;
  sources: Array<{
    name: string;
    amount: number;
    percentage: number;
    type: 'salary' | 'bonus' | 'side-hustle' | 'investment' | 'other';
  }>;
  status: 'above' | 'below' | 'on-track';
}

interface IncomeAnalysisChartProps {
  data: IncomeData[];
  period?: 'week' | 'month' | 'quarter' | 'year';
  viewType?: 'timeline' | 'sources' | 'variance';
  onPeriodChange?: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  onViewChange?: (view: 'timeline' | 'sources' | 'variance') => void;
  isLoading?: boolean;
}

export default function IncomeChart({
  data = [],
  period = 'month',
  viewType = 'timeline',
  onPeriodChange,
  onViewChange,
  isLoading = false
}: IncomeAnalysisChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const incomeStats = useMemo(() => {
    if (!data.length) return null;

    const totalPlanned = data.reduce((sum, d) => sum + d.plannedIncome, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actualIncome, 0);
    const totalVariance = totalActual - totalPlanned;
    const avgMonthlyIncome = totalActual / data.length;
    const consistencyScore = data.filter(d => Math.abs(d.variancePercentage) <= 10).length / data.length * 100;

    // Get all unique income sources
    const allSources = data.flatMap(d => d.sources);
    const sourceMap = new Map();
    allSources.forEach(source => {
      const key = source.name;
      if (sourceMap.has(key)) {
        sourceMap.get(key).amount += source.amount;
      } else {
        sourceMap.set(key, { ...source });
      }
    });
    const consolidatedSources = Array.from(sourceMap.values());

    return {
      totalPlanned,
      totalActual,
      totalVariance,
      avgMonthlyIncome,
      consistencyScore,
      sources: consolidatedSources
    };
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (period) {
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'quarter':
        return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return dateStr;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-500';
    if (variance < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'salary': return '💼';
      case 'bonus': return '🎉';
      case 'side-hustle': return '🚀';
      case 'investment': return '📈';
      default: return '💰';
    }
  };

  const TimelineView = () => {
    const maxIncome = Math.max(...data.map(d => Math.max(d.plannedIncome, d.actualIncome)));

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-center h-64 space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center max-w-[80px]">
              <div className="flex flex-col items-center justify-end h-full w-full space-y-1">
                {/* Planned Income Bar */}
                <div
                  className="w-full bg-blue-400/50 rounded-t-sm relative group cursor-pointer"
                  style={{ height: `${(item.plannedIncome / maxIncome) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Planned: {formatCurrency(item.plannedIncome)}
                  </div>
                </div>

                {/* Actual Income Bar */}
                <div
                  className="w-full bg-green-400/70 rounded-t-sm relative group cursor-pointer"
                  style={{ height: `${(item.actualIncome / maxIncome) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Actual: {formatCurrency(item.actualIncome)}
                  </div>
                </div>
              </div>

              {/* Period Label */}
              <div className="text-xs text-white/60 mt-2 text-center">
                {formatDate(item.period)}
              </div>

              {/* Variance Indicator */}
              <div className={`text-xs font-medium ${getVarianceColor(item.variance)}`}>
                {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-400/50 rounded mr-2"></div>
            <span className="text-white/70">Planned Income</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400/70 rounded mr-2"></div>
            <span className="text-white/70">Actual Income</span>
          </div>
        </div>
      </div>
    );
  };

  const SourcesView = () => {
    if (!incomeStats?.sources.length) return null;

    const totalSourceIncome = incomeStats.sources.reduce((sum, s) => sum + s.amount, 0);

    return (
      <div className="space-y-4">
        {/* Pie Chart Representation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <svg width="200" height="200">
              {(() => {
                let currentAngle = -90;
                return incomeStats.sources.map((source, index) => {
                  const percentage = (source.amount / totalSourceIncome) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = (currentAngle * Math.PI) / 180;
                  const endAngle = ((currentAngle + angle) * Math.PI) / 180;

                  const x1 = 100 + 80 * Math.cos(startAngle);
                  const y1 = 100 + 80 * Math.sin(startAngle);
                  const x2 = 100 + 80 * Math.cos(endAngle);
                  const y2 = 100 + 80 * Math.sin(endAngle);

                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    'Z'
                  ].join(' ');

                  currentAngle += angle;

                  const colors = ['#FFD166', '#8FAD77', '#5E7F9B', '#E76F51', '#2A9D8F'];
                  const color = colors[index % colors.length];

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={color}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      opacity={0.8}
                    />
                  );
                });
              })()}
            </svg>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="space-y-3">
          {incomeStats.sources.map((source, index) => {
            const percentage = (source.amount / totalSourceIncome) * 100;
            const colors = ['#FFD166', '#8FAD77', '#5E7F9B', '#E76F51', '#2A9D8F'];
            const color = colors[index % colors.length];

            return (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSourceTypeIcon(source.type)}</span>
                    <span className="text-white font-medium">{source.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{formatCurrency(source.amount)}</div>
                  <div className="text-white/60 text-sm">{percentage.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const VarianceView = () => {
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">{formatDate(item.period)}</h4>
              <Badge
                variant="outline"
                className={`${
                  item.status === 'above' ? 'text-green-500 border-green-500' :
                  item.status === 'below' ? 'text-red-500 border-red-500' :
                  'text-blue-500 border-blue-500'
                }`}
              >
                {item.status === 'above' ? 'Above Plan' :
                 item.status === 'below' ? 'Below Plan' : 'On Track'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-xs text-white/70">Planned</div>
                <div className="font-semibold text-blue-400">{formatCurrency(item.plannedIncome)}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Actual</div>
                <div className="font-semibold text-white">{formatCurrency(item.actualIncome)}</div>
              </div>
              <div>
                <div className="text-xs text-white/70">Variance</div>
                <div className={`font-semibold ${getVarianceColor(item.variance)}`}>
                  {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                </div>
              </div>
            </div>

            <div className="text-xs text-white/60 text-right">
              {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}% vs plan
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Income Analysis
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewType} onValueChange={onViewChange}>
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="sources">Sources</SelectItem>
                <SelectItem value="variance">Variance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {incomeStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 text-blue-400 mr-1" />
                <span className="text-sm text-white/70">Total Planned</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {formatCurrency(incomeStats.totalPlanned)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-sm text-white/70">Total Actual</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {formatCurrency(incomeStats.totalActual)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-white/70 mr-1" />
                <span className="text-sm text-white/70">Avg Monthly</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(incomeStats.avgMonthlyIncome)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-sm text-white/70">Consistency</span>
              </div>
              <div className={`text-lg font-semibold ${
                incomeStats.consistencyScore >= 80 ? 'text-green-400' :
                incomeStats.consistencyScore >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {incomeStats.consistencyScore.toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* Chart Content */}
        <div className="min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-white/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="ml-3">Loading income data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-white/50">
              <TrendingUp className="h-12 w-12 mb-4" />
              <p>No income data available for the selected period</p>
            </div>
          ) : (
            <>
              {viewType === 'timeline' && <TimelineView />}
              {viewType === 'sources' && <SourcesView />}
              {viewType === 'variance' && <VarianceView />}
            </>
          )}
        </div>

        {/* Income Health Summary */}
        {incomeStats && (
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Income Health</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  incomeStats.totalVariance >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-white/70">
                  {incomeStats.totalVariance >= 0 ? 'Exceeding' : 'Missing'} income goals by{' '}
                  {formatCurrency(Math.abs(incomeStats.totalVariance))}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  incomeStats.consistencyScore >= 80 ? 'bg-green-500' :
                  incomeStats.consistencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-white/70">
                  Income consistency is{' '}
                  {incomeStats.consistencyScore >= 80 ? 'excellent' :
                   incomeStats.consistencyScore >= 60 ? 'good' : 'needs improvement'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}