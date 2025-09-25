'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DocumentTextIcon,
  StarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  description?: string
}

interface BudgetTemplate {
  id: string
  name: string
  description: string
  categories: BudgetCategory[]
  type: 'system' | 'custom' | 'community'
  tags: string[]
  usageCount: number
  rating: number
  author?: string
  createdAt: string
  isDefault: boolean
  isFavorite: boolean
  familySize?: string
  incomeRange?: string
  region?: string
}

interface TemplateSelectorProps {
  templates: BudgetTemplate[]
  onTemplateSelect: (template: BudgetTemplate) => void
  onTemplatePreview: (template: BudgetTemplate) => void
  onCreateTemplate: () => void
  selectedTemplateId?: string
  familyProfile?: {
    size: string
    incomeRange: string
    region: string
    hasDebt: boolean
    hasChildren: boolean
  }
  showRecommendations?: boolean
  enableFiltering?: boolean
  className?: string
}

const TEMPLATE_TYPES = {
  system: { label: 'Built-in', color: 'text-primary' },
  custom: { label: 'My Templates', color: 'text-success' },
  community: { label: 'Community', color: 'text-warning' }
}

const POPULAR_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'fifty-thirty-twenty',
    name: '50/30/20 Rule',
    description: 'Classic budgeting rule: 50% needs, 30% wants, 20% savings',
    categories: [
      { id: '1', name: 'Needs (Housing, Utilities, Food)', targetPercentage: 50, color: '#E76F51' },
      { id: '2', name: 'Wants (Entertainment, Dining Out)', targetPercentage: 30, color: '#FFD166' },
      { id: '3', name: 'Savings & Debt Repayment', targetPercentage: 20, color: '#8FAD77' }
    ],
    type: 'system',
    tags: ['beginner', 'simple', 'popular'],
    usageCount: 15420,
    rating: 4.6,
    createdAt: '2024-01-01',
    isDefault: true,
    isFavorite: false
  },
  {
    id: 'zero-based',
    name: 'Zero-Based Budget',
    description: 'Give every dollar a job - income minus expenses equals zero',
    categories: [
      { id: '1', name: 'Housing', targetPercentage: 25, color: '#264653' },
      { id: '2', name: 'Transportation', targetPercentage: 15, color: '#2A9D8F' },
      { id: '3', name: 'Food & Groceries', targetPercentage: 12, color: '#E9C46A' },
      { id: '4', name: 'Utilities', targetPercentage: 8, color: '#F4A261' },
      { id: '5', name: 'Savings', targetPercentage: 15, color: '#8FAD77' },
      { id: '6', name: 'Debt Payment', targetPercentage: 10, color: '#E76F51' },
      { id: '7', name: 'Personal', targetPercentage: 8, color: '#577590' },
      { id: '8', name: 'Entertainment', targetPercentage: 7, color: '#76C893' }
    ],
    type: 'system',
    tags: ['detailed', 'comprehensive', 'advanced'],
    usageCount: 8920,
    rating: 4.4,
    createdAt: '2024-01-01',
    isDefault: false,
    isFavorite: false
  },
  {
    id: 'envelope-method',
    name: 'Envelope Method',
    description: 'Allocate cash to different spending categories using virtual envelopes',
    categories: [
      { id: '1', name: 'Fixed Expenses', targetPercentage: 55, color: '#264653' },
      { id: '2', name: 'Variable Expenses', targetPercentage: 25, color: '#E9C46A' },
      { id: '3', name: 'Emergency Fund', targetPercentage: 10, color: '#E76F51' },
      { id: '4', name: 'Fun Money', targetPercentage: 10, color: '#FFD166' }
    ],
    type: 'system',
    tags: ['cash-based', 'simple', 'discipline'],
    usageCount: 6540,
    rating: 4.2,
    createdAt: '2024-01-01',
    isDefault: false,
    isFavorite: false
  }
]

export default function TemplateSelector({
  templates: providedTemplates = [],
  onTemplateSelect,
  onTemplatePreview,
  onCreateTemplate,
  selectedTemplateId,
  familyProfile,
  showRecommendations = true,
  enableFiltering = true,
  className = ''
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'system' | 'custom' | 'community'>('all')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent' | 'name'>('popular')
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Combine provided templates with popular templates
  const allTemplates = useMemo(() => {
    const combined = [...POPULAR_TEMPLATES, ...providedTemplates]

    // Remove duplicates based on ID
    const uniqueTemplates = combined.filter((template, index, self) =>
      index === self.findIndex(t => t.id === template.id)
    )

    return uniqueTemplates.map(template => ({
      ...template,
      isFavorite: favorites.has(template.id)
    }))
  }, [providedTemplates, favorites])

  // Get all available tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    allTemplates.forEach(template => {
      template.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [allTemplates])

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(template => template.type === selectedType)
    }

    // Filter by tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(template =>
        template.tags.some(tag => selectedTags.has(tag))
      )
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.usageCount - a.usageCount
        case 'rating':
          return b.rating - a.rating
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [allTemplates, searchQuery, selectedType, selectedTags, sortBy])

  // Get recommended templates based on family profile
  const recommendedTemplates = useMemo(() => {
    if (!familyProfile || !showRecommendations) return []

    return allTemplates.filter(template => {
      let score = 0

      // Match family size
      if (template.familySize === familyProfile.size) score += 3

      // Match income range
      if (template.incomeRange === familyProfile.incomeRange) score += 2

      // Match region
      if (template.region === familyProfile.region) score += 1

      // Recommend debt-focused templates for families with debt
      if (familyProfile.hasDebt && template.tags.includes('debt')) score += 2

      // Recommend child-friendly templates for families with children
      if (familyProfile.hasChildren && template.tags.includes('family')) score += 2

      return score > 1
    }).slice(0, 3)
  }, [allTemplates, familyProfile, showRecommendations])

  const toggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites)
    if (favorites.has(templateId)) {
      newFavorites.delete(templateId)
    } else {
      newFavorites.add(templateId)
    }
    setFavorites(newFavorites)
  }

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags)
    if (selectedTags.has(tag)) {
      newTags.delete(tag)
    } else {
      newTags.add(tag)
    }
    setSelectedTags(newTags)
  }

  const renderTemplate = (template: BudgetTemplate, isRecommended = false) => {
    const isSelected = selectedTemplateId === template.id
    const totalPercentage = template.categories.reduce((sum, cat) => sum + cat.targetPercentage, 0)

    return (
      <div
        key={template.id}
        className={`glassmorphic p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'border-primary ring-2 ring-primary/50'
            : 'border-white/10 hover:border-white/20'
        } ${isRecommended ? 'ring-2 ring-success/30' : ''}`}
        onClick={() => onTemplateSelect(template)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-white">{template.name}</h3>

              {template.isDefault && (
                <CheckCircleIcon className="w-4 h-4 text-success" />
              )}

              {isRecommended && (
                <span className="px-2 py-0.5 bg-success/20 text-success rounded-full text-xs">
                  Recommended
                </span>
              )}

              <span className={`text-xs ${TEMPLATE_TYPES[template.type].color}`}>
                {TEMPLATE_TYPES[template.type].label}
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-2">{template.description}</p>

            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <StarIcon className="w-3 h-3" />
                <span>{template.rating.toFixed(1)}</span>
              </div>

              <span>•</span>

              <div className="flex items-center space-x-1">
                <ArrowDownTrayIcon className="w-3 h-3" />
                <span>{template.usageCount.toLocaleString()}</span>
              </div>

              {template.author && (
                <>
                  <span>•</span>
                  <span>by {template.author}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(template.id)
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {favorites.has(template.id) ? (
                <StarIconSolid className="w-4 h-4 text-warning" />
              ) : (
                <StarIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onTemplatePreview(template)
                setShowPreview(template.id)
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <InformationCircleIcon className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Categories Preview */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Categories ({template.categories.length})</span>
            <span className={totalPercentage === 100 ? 'text-success' : 'text-warning'}>
              {totalPercentage}%
            </span>
          </div>

          <div className="space-y-1">
            {template.categories.slice(0, 3).map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-gray-300 truncate">{category.name}</span>
                </div>
                <span className="text-sm text-gray-400">{category.targetPercentage}%</span>
              </div>
            ))}

            {template.categories.length > 3 && (
              <div className="text-xs text-gray-500 text-center py-1">
                +{template.categories.length - 3} more categories
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-white/5 text-xs text-gray-400 rounded-full"
            >
              {tag}
            </span>
          ))}

          {template.tags.length > 4 && (
            <span className="px-2 py-0.5 bg-white/5 text-xs text-gray-500 rounded-full">
              +{template.tags.length - 4}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all duration-300 ${
              totalPercentage === 100 ? 'bg-success' : 'bg-warning'
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Budget Templates</h2>
          <p className="text-sm text-gray-400">
            Choose a template to quickly set up your budget categories
          </p>
        </div>

        <button
          onClick={onCreateTemplate}
          className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Search and Filters */}
      {enableFiltering && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
            <div className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All</option>
                <option value="system">Built-in</option>
                <option value="custom">My Templates</option>
                <option value="community">Community</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="popular">Popular</option>
                <option value="rating">Rating</option>
                <option value="recent">Recent</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-gray-400">Filter by tags:</span>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Templates */}
      {recommendedTemplates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Recommended for You</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTemplates.map((template) => renderTemplate(template, true))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">
            All Templates ({filteredTemplates.length})
          </h3>

          {selectedTags.size > 0 && (
            <button
              onClick={() => setSelectedTags(new Set())}
              className="text-sm text-primary hover:text-primary/80"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="glassmorphic p-8 rounded-lg border border-white/10 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No Templates Found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery || selectedTags.size > 0
                ? 'Try adjusting your search or filters'
                : 'Create your first custom template to get started'
              }
            </p>
            <button
              onClick={onCreateTemplate}
              className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => renderTemplate(template))}
          </div>
        )}
      </div>
    </div>
  )
}