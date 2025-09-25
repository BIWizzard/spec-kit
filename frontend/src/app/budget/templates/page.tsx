'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Star,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  Heart,
  Users,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  type: 'popular' | 'lifecycle' | 'goal_based' | 'custom';
  categories: {
    name: string;
    percentage: number;
    color: string;
    description?: string;
  }[];
  totalPercentage: number;
  popularity: number;
  rating: number;
  usageCount: number;
  tags: string[];
  isCustom: boolean;
  isFavorited: boolean;
  createdBy?: string;
  createdAt: string;
}

const BudgetTemplatesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<BudgetTemplate[]>({
    queryKey: ['budget', 'templates'],
    queryFn: async () => {
      const response = await fetch('/api/budget/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch('/api/budget/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (!response.ok) throw new Error('Failed to apply template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
      setShowPreview(false);
      setSelectedTemplate(null);
    },
  });

  const templateTypes = [
    { id: 'all', name: 'All Templates', icon: BookOpen },
    { id: 'popular', name: 'Popular Methods', icon: TrendingUp },
    { id: 'lifecycle', name: 'Life Stages', icon: Users },
    { id: 'goal_based', name: 'Goal-Based', icon: Target },
    { id: 'custom', name: 'Custom', icon: Star }
  ];

  const popularTemplates = [
    {
      id: 'rule-50-30-20',
      name: '50/30/20 Rule',
      description: 'Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment',
      type: 'popular' as const,
      categories: [
        { name: 'Needs', percentage: 50, color: '#8FAD77', description: 'Housing, utilities, groceries, minimum debt payments' },
        { name: 'Wants', percentage: 30, color: '#FFD166', description: 'Entertainment, dining out, hobbies, subscriptions' },
        { name: 'Savings & Debt', percentage: 20, color: '#5E7F9B', description: 'Emergency fund, retirement, extra debt payments' }
      ],
      totalPercentage: 100,
      popularity: 95,
      rating: 4.8,
      usageCount: 15420,
      tags: ['beginner-friendly', 'simple', 'balanced'],
      isCustom: false,
      isFavorited: false,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'zero-based',
      name: 'Zero-Based Budget',
      description: 'Every dollar is assigned a purpose, income minus expenses equals zero',
      type: 'popular' as const,
      categories: [
        { name: 'Housing', percentage: 25, color: '#8FAD77' },
        { name: 'Food', percentage: 15, color: '#FFD166' },
        { name: 'Transportation', percentage: 15, color: '#5E7F9B' },
        { name: 'Utilities', percentage: 10, color: '#F06292' },
        { name: 'Savings', percentage: 20, color: '#9C27B0' },
        { name: 'Personal', percentage: 10, color: '#FF9800' },
        { name: 'Debt Payment', percentage: 5, color: '#F44336' }
      ],
      totalPercentage: 100,
      popularity: 87,
      rating: 4.6,
      usageCount: 8930,
      tags: ['detailed', 'comprehensive', 'debt-focused'],
      isCustom: false,
      isFavorited: true,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || template.type === selectedType;

    return matchesSearch && matchesType;
  });

  const handleApplyTemplate = (template: BudgetTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const confirmApplyTemplate = () => {
    if (selectedTemplate) {
      applyTemplateMutation.mutate(selectedTemplate.id);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center">
            <Link
              href="/budget"
              className="mr-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget Templates</h1>
              <p className="text-slate-400">
                Choose from proven budgeting strategies or create your own
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <Link
              href="/budget/templates/create"
              className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              {templateTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                      selectedType === type.id
                        ? 'bg-[#FFD166] text-slate-900'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Featured Templates */}
        {selectedType === 'all' || selectedType === 'popular' ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-[#FFD166]" />
              Featured Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {popularTemplates.map((template) => (
                <div key={template.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-[#FFD166]/20 p-2 rounded-lg mr-3">
                        <TrendingUp className="w-5 h-5 text-[#FFD166]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{template.name}</h3>
                        <div className="flex items-center mt-1">
                          <div className="flex items-center mr-4">
                            <Star className="w-4 h-4 text-[#FFD166] fill-current" />
                            <span className="text-sm text-slate-300 ml-1">{template.rating}</span>
                          </div>
                          <span className="text-sm text-slate-400">{formatNumber(template.usageCount)} users</span>
                        </div>
                      </div>
                    </div>
                    {template.isFavorited && (
                      <Heart className="w-5 h-5 text-red-400 fill-current" />
                    )}
                  </div>

                  <p className="text-slate-300 text-sm mb-4">{template.description}</p>

                  {/* Category Breakdown */}
                  <div className="space-y-2 mb-4">
                    {template.categories.slice(0, 3).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="text-sm text-white">{category.name}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-300">{category.percentage}%</span>
                      </div>
                    ))}
                    {template.categories.length > 3 && (
                      <div className="text-xs text-slate-400">
                        +{template.categories.length - 3} more categories
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 rounded-full text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      className="flex-1 px-4 py-2 bg-[#8FAD77] text-white rounded-lg hover:bg-[#8FAD77]/90 transition-colors flex items-center justify-center"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* All Templates Grid */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">All Templates</h2>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
              <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Templates Found</h3>
              <p className="text-slate-400 mb-6">
                {searchQuery ? `No templates match "${searchQuery}"` : 'No templates available for the selected type'}
              </p>
              <Link
                href="/budget/templates/create"
                className="inline-flex items-center px-6 py-3 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Template
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="bg-[#5E7F9B]/20 p-2 rounded-lg mr-3">
                        <BookOpen className="w-4 h-4 text-[#5E7F9B]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{template.name}</h3>
                        {!template.isCustom && (
                          <div className="flex items-center mt-1">
                            <Star className="w-3 h-3 text-[#FFD166] fill-current" />
                            <span className="text-xs text-slate-400 ml-1">{template.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {template.isCustom && (
                      <span className="px-2 py-1 bg-[#FFD166]/20 text-[#FFD166] rounded-full text-xs font-medium">
                        Custom
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-sm mb-3">{template.description}</p>

                  {/* Category Preview */}
                  <div className="flex -space-x-1 mb-3">
                    {template.categories.slice(0, 4).map((category, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full border-2 border-slate-900"
                        style={{ backgroundColor: category.color }}
                        title={`${category.name}: ${category.percentage}%`}
                      ></div>
                    ))}
                    {template.categories.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center">
                        <span className="text-xs text-white">+{template.categories.length - 4}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 rounded-full text-xs text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="flex-1 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      disabled={applyTemplateMutation.isPending}
                      className="flex-1 px-3 py-2 bg-[#8FAD77] text-white rounded-lg hover:bg-[#8FAD77]/90 transition-colors disabled:opacity-50 text-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedTemplate.name}</h2>
                  <p className="text-slate-400 mt-1">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedTemplate(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-white">Category Breakdown</h3>
                {selectedTemplate.categories.map((category, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="font-medium text-white">{category.name}</span>
                      </div>
                      <span className="font-bold text-white">{category.percentage}%</span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-400 ml-7">{category.description}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedTemplate(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApplyTemplate}
                  disabled={applyTemplateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-[#8FAD77] text-white rounded-lg hover:bg-[#8FAD77]/90 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {applyTemplateMutation.isPending ? (
                    'Applying...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Apply Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTemplatesPage;