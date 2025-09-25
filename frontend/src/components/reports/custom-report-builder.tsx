'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Play,
  Download,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ReportField {
  id: string;
  name: string;
  type: 'date' | 'currency' | 'percentage' | 'text' | 'category';
  source: 'income' | 'expenses' | 'budget' | 'accounts' | 'transactions';
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: string | number | Array<string>;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'table';
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
}

interface CustomReportConfig {
  name: string;
  description: string;
  fields: string[];
  filters: ReportFilter[];
  dateRange: {
    start: string;
    end: string;
    preset?: 'last_month' | 'last_quarter' | 'last_year' | 'ytd' | 'custom';
  };
  chart: ChartConfig;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    enabled: boolean;
  };
}

interface CustomReportBuilderProps {
  onSave?: (config: CustomReportConfig) => void;
  onRun?: (config: CustomReportConfig) => void;
  initialConfig?: Partial<CustomReportConfig>;
  isLoading?: boolean;
}

const AVAILABLE_FIELDS: ReportField[] = [
  { id: 'income_amount', name: 'Income Amount', type: 'currency', source: 'income' },
  { id: 'income_date', name: 'Income Date', type: 'date', source: 'income' },
  { id: 'income_source', name: 'Income Source', type: 'text', source: 'income' },
  { id: 'expense_amount', name: 'Expense Amount', type: 'currency', source: 'expenses' },
  { id: 'expense_category', name: 'Expense Category', type: 'category', source: 'expenses' },
  { id: 'expense_date', name: 'Expense Date', type: 'date', source: 'expenses' },
  { id: 'budget_allocated', name: 'Budget Allocated', type: 'currency', source: 'budget' },
  { id: 'budget_spent', name: 'Budget Spent', type: 'currency', source: 'budget' },
  { id: 'budget_category', name: 'Budget Category', type: 'category', source: 'budget' },
  { id: 'account_balance', name: 'Account Balance', type: 'currency', source: 'accounts' },
  { id: 'account_name', name: 'Account Name', type: 'text', source: 'accounts' },
  { id: 'transaction_amount', name: 'Transaction Amount', type: 'currency', source: 'transactions' },
  { id: 'transaction_date', name: 'Transaction Date', type: 'date', source: 'transactions' },
  { id: 'transaction_category', name: 'Transaction Category', type: 'category', source: 'transactions' }
];

export default function CustomReportBuilder({
  onSave,
  onRun,
  initialConfig,
  isLoading = false
}: CustomReportBuilderProps) {
  const [config, setConfig] = useState<CustomReportConfig>({
    name: '',
    description: '',
    fields: [],
    filters: [],
    dateRange: {
      start: '',
      end: '',
      preset: 'last_month'
    },
    chart: {
      type: 'table',
      aggregation: 'sum'
    },
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState('fields');

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Math.random().toString(36).substr(2, 9),
      field: '',
      operator: 'equals',
      value: ''
    };
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const removeFilter = (id: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id)
    }));
  };

  const updateFilter = (id: string, updates: Partial<ReportFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const toggleField = (fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldId)
        ? prev.fields.filter(f => f !== fieldId)
        : [...prev.fields, fieldId]
    }));
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      case 'line': return <TrendingUp className="h-4 w-4" />;
      case 'pie': return <PieChart className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle className="text-xl font-semibold text-white">
            Custom Report Builder
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRun?.(config)}
              disabled={isLoading || !config.name || config.fields.length === 0}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave?.(config)}
              disabled={isLoading || !config.name}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 border-white/20">
            <TabsTrigger value="basic" className="text-white data-[state=active]:bg-white/20">
              Basic
            </TabsTrigger>
            <TabsTrigger value="fields" className="text-white data-[state=active]:bg-white/20">
              Fields
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-white data-[state=active]:bg-white/20">
              Filters
            </TabsTrigger>
            <TabsTrigger value="chart" className="text-white data-[state=active]:bg-white/20">
              Chart
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-white data-[state=active]:bg-white/20">
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="report-name" className="text-white">Report Name *</Label>
                <Input
                  id="report-name"
                  placeholder="e.g., Monthly Spending by Category"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div>
                <Label htmlFor="report-description" className="text-white">Description</Label>
                <Input
                  id="report-description"
                  placeholder="Brief description of what this report shows"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Date Range Preset</Label>
                  <Select
                    value={config.dateRange.preset || 'custom'}
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, preset: value as any }
                    }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_quarter">Last Quarter</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.dateRange.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date" className="text-white">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={config.dateRange.start}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-white">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={config.dateRange.end}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="text-white">Select Fields to Include</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-black/20 rounded-lg">
                {AVAILABLE_FIELDS.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded">
                    <Checkbox
                      checked={config.fields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-white">{field.name}</div>
                      <div className="text-xs text-white/60 capitalize">{field.source} • {field.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white">Selected Fields ({config.fields.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.fields.map((fieldId) => {
                  const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                  return field ? (
                    <Badge
                      key={fieldId}
                      variant="outline"
                      className="text-white border-white/30 bg-white/10"
                    >
                      {field.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-white">Report Filters</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </div>

            <div className="space-y-3">
              {config.filters.map((filter, index) => (
                <div key={filter.id} className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => updateFilter(filter.id, { field: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {AVAILABLE_FIELDS.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(filter.id, { operator: value as any })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="between">Between</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Value"
                      value={filter.value as string}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {config.filters.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <Filter className="h-8 w-8 mx-auto mb-2" />
                  <p>No filters added</p>
                  <p className="text-sm">Add filters to narrow down your report data</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chart" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Chart Type</Label>
                <Select
                  value={config.chart.type}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    chart: { ...prev.chart, type: value as any }
                  }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Aggregation</Label>
                <Select
                  value={config.chart.aggregation}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    chart: { ...prev.chart, aggregation: value as any }
                  }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-black/20 rounded-lg">
              <h4 className="font-medium text-white mb-2 flex items-center">
                {getChartIcon(config.chart.type)}
                <span className="ml-2">Chart Preview</span>
              </h4>
              <p className="text-white/60 text-sm">
                {config.chart.type === 'table'
                  ? 'Data will be displayed in a sortable table format'
                  : `Data will be visualized as a ${config.chart.type} chart with ${config.chart.aggregation} aggregation`
                }
              </p>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={config.schedule?.enabled || false}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, enabled: checked as boolean, frequency: prev.schedule?.frequency || 'monthly' }
                }))}
              />
              <Label className="text-white">Enable Scheduled Reports</Label>
            </div>

            {config.schedule?.enabled && (
              <div>
                <Label className="text-white">Frequency</Label>
                <Select
                  value={config.schedule.frequency}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule!, frequency: value as any }
                  }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-4 bg-black/20 rounded-lg">
              <h4 className="font-medium text-white mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Summary
              </h4>
              <p className="text-white/60 text-sm">
                {config.schedule?.enabled
                  ? `This report will be generated ${config.schedule.frequency} and delivered automatically`
                  : 'Scheduled reporting is disabled. Report will only run manually.'
                }
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}