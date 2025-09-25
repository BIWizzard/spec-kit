'use client'

import { useState, useMemo } from 'react'

interface SpendingCategory {
  id: string
  name: string
  parentCategoryId?: string
  budgetCategoryId: string
  icon: string
  color: string
  monthlyTarget?: number
  isActive: boolean
  spentThisMonth: number
  transactionCount: number
  lastUsed?: Date
}

interface BudgetCategory {
  id: string
  name: string
  color: string
}

interface SpendingCategoriesProps {
  onCategoryCreate?: (category: Omit<SpendingCategory, 'id' | 'spentThisMonth' | 'transactionCount'>) => void
  onCategoryUpdate?: (id: string, category: Partial<SpendingCategory>) => void
  onCategoryDelete?: (id: string) => void
}

const iconOptions = [
  '🍔', '🛒', '⛽', '🚗', '🏠', '💡', '📱', '💊', '👔', '🎬',
  '📚', '🏋️', '💄', '🌮', '☕', '🍕', '🚕', '✈️', '🎮', '🎵'
]

const colorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
  '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#EE5A6F', '#C44569'
]

export default function SpendingCategoriesManagement({
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete
}: SpendingCategoriesProps) {
  const [categories, setCategories] = useState<SpendingCategory[]>([
    {
      id: '1',
      name: 'Groceries',
      budgetCategoryId: 'needs',
      icon: '🛒',
      color: '#4ECDC4',
      monthlyTarget: 400,
      isActive: true,
      spentThisMonth: 285,
      transactionCount: 12,
      lastUsed: new Date('2024-12-01')
    },
    {
      id: '2',
      name: 'Gas',
      budgetCategoryId: 'needs',
      icon: '⛽',
      color: '#FF6B6B',
      monthlyTarget: 150,
      isActive: true,
      spentThisMonth: 95,
      transactionCount: 4,
      lastUsed: new Date('2024-11-30')
    },
    {
      id: '3',
      name: 'Dining Out',
      parentCategoryId: '1',
      budgetCategoryId: 'wants',
      icon: '🍔',
      color: '#FECA57',
      monthlyTarget: 200,
      isActive: true,
      spentThisMonth: 180,
      transactionCount: 8,
      lastUsed: new Date('2024-11-29')
    },
    {
      id: '4',
      name: 'Entertainment',
      budgetCategoryId: 'wants',
      icon: '🎬',
      color: '#45B7D1',
      monthlyTarget: 100,
      isActive: true,
      spentThisMonth: 65,
      transactionCount: 3,
      lastUsed: new Date('2024-11-25')
    },
    {
      id: '5',
      name: 'Emergency Fund',
      budgetCategoryId: 'savings',
      icon: '🛡️',
      color: '#96CEB4',
      monthlyTarget: 500,
      isActive: true,
      spentThisMonth: 0,
      transactionCount: 0
    }
  ])

  const [budgetCategories] = useState<BudgetCategory[]>([
    { id: 'needs', name: 'Needs (50%)', color: '#FF6B6B' },
    { id: 'wants', name: 'Wants (30%)', color: '#4ECDC4' },
    { id: 'savings', name: 'Savings (20%)', color: '#45B7D1' }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBudgetFilter, setSelectedBudgetFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'target' | 'usage'>('name')

  const [formData, setFormData] = useState({
    name: '',
    parentCategoryId: '',
    budgetCategoryId: 'needs',
    icon: '🛒',
    color: '#4ECDC4',
    monthlyTarget: '',
    isActive: true
  })

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesBudget = selectedBudgetFilter === 'all' || category.budgetCategoryId === selectedBudgetFilter
      return matchesSearch && matchesBudget
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'spent':
          return b.spentThisMonth - a.spentThisMonth
        case 'target':
          return (b.monthlyTarget || 0) - (a.monthlyTarget || 0)
        case 'usage':
          return b.transactionCount - a.transactionCount
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [categories, searchTerm, selectedBudgetFilter, sortBy])

  const handleCreateCategory = () => {
    const newCategory: SpendingCategory = {
      id: Date.now().toString(),
      name: formData.name,
      parentCategoryId: formData.parentCategoryId || undefined,
      budgetCategoryId: formData.budgetCategoryId,
      icon: formData.icon,
      color: formData.color,
      monthlyTarget: parseFloat(formData.monthlyTarget) || undefined,
      isActive: formData.isActive,
      spentThisMonth: 0,
      transactionCount: 0
    }

    setCategories(prev => [...prev, newCategory])
    onCategoryCreate?.(newCategory)
    resetForm()
  }

  const handleUpdateCategory = (categoryId: string, updates: Partial<SpendingCategory>) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ))
    onCategoryUpdate?.(categoryId, updates)
  }

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId))
      onCategoryDelete?.(categoryId)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      parentCategoryId: '',
      budgetCategoryId: 'needs',
      icon: '🛒',
      color: '#4ECDC4',
      monthlyTarget: '',
      isActive: true
    })
    setShowCreateForm(false)
    setEditingCategory(null)
  }

  const startEditing = (category: SpendingCategory) => {
    setFormData({
      name: category.name,
      parentCategoryId: category.parentCategoryId || '',
      budgetCategoryId: category.budgetCategoryId,
      icon: category.icon,
      color: category.color,
      monthlyTarget: category.monthlyTarget?.toString() || '',
      isActive: category.isActive
    })
    setEditingCategory(category.id)
    setShowCreateForm(true)
  }

  const saveEdit = () => {
    if (editingCategory) {
      const updates = {
        name: formData.name,
        parentCategoryId: formData.parentCategoryId || undefined,
        budgetCategoryId: formData.budgetCategoryId,
        icon: formData.icon,
        color: formData.color,
        monthlyTarget: parseFloat(formData.monthlyTarget) || undefined,
        isActive: formData.isActive
      }
      handleUpdateCategory(editingCategory, updates)
      resetForm()
    }
  }

  const getUsageStatus = (category: SpendingCategory) => {
    if (!category.monthlyTarget) return { status: 'none', percentage: 0 }

    const percentage = (category.spentThisMonth / category.monthlyTarget) * 100

    if (percentage >= 100) return { status: 'over', percentage }
    if (percentage >= 80) return { status: 'warning', percentage }
    if (percentage >= 50) return { status: 'good', percentage }
    return { status: 'under', percentage }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'text-error'
      case 'warning': return 'text-warning'
      case 'good': return 'text-success'
      default: return 'text-muted'
    }
  }

  const mainCategories = filteredAndSortedCategories.filter(cat => !cat.parentCategoryId)
  const getSubCategories = (parentId: string) =>
    filteredAndSortedCategories.filter(cat => cat.parentCategoryId === parentId)

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Spending Categories</h2>
          <p className="text-muted mt-1">Organize and track your spending patterns</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors"
        >
          + Add Category
        </button>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
          />
        </div>

        <div>
          <select
            value={selectedBudgetFilter}
            onChange={(e) => setSelectedBudgetFilter(e.target.value)}
            className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
          >
            <option value="all">All Budget Categories</option>
            {budgetCategories.map(budget => (
              <option key={budget.id} value={budget.id}>{budget.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
          >
            <option value="name">Sort by Name</option>
            <option value="spent">Sort by Spent</option>
            <option value="target">Sort by Target</option>
            <option value="usage">Sort by Usage</option>
          </select>
        </div>

        <div className="text-sm text-muted flex items-center">
          {filteredAndSortedCategories.length} of {categories.length} categories
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="glass-card bg-glass-bg-light p-4 mb-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-primary mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                placeholder="e.g., Groceries, Dining Out"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Monthly Target
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  value={formData.monthlyTarget}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyTarget: e.target.value }))}
                  className="w-full pl-8 pr-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Parent Category
              </label>
              <select
                value={formData.parentCategoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, parentCategoryId: e.target.value }))}
                className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
              >
                <option value="">None (Main Category)</option>
                {mainCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Budget Category *
              </label>
              <select
                value={formData.budgetCategoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetCategoryId: e.target.value }))}
                className="w-full px-4 py-2 bg-glass-bg border border-glass-border/50 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-kgiq-primary/50 transition-colors"
              >
                {budgetCategories.map(budget => (
                  <option key={budget.id} value={budget.id}>{budget.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2 p-2 bg-glass-bg border border-glass-border/50 rounded-lg max-h-20 overflow-y-auto">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className={`w-8 h-8 text-lg hover:bg-glass-bg-light rounded transition-colors ${
                      formData.icon === icon ? 'bg-kgiq-primary/20' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2 p-2 bg-glass-bg border border-glass-border/50 rounded-lg">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-kgiq-primary border-glass-border/50 rounded focus:ring-2 focus:ring-kgiq-primary/50"
              />
              <span className="ml-2 text-sm text-primary">Active</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-muted hover:text-primary border border-glass-border/50 rounded-lg hover:border-glass-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? saveEdit : handleCreateCategory}
                disabled={!formData.name.trim()}
                className="px-6 py-2 bg-kgiq-primary hover:bg-kgiq-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {mainCategories.map(category => {
          const usage = getUsageStatus(category)
          const subCategories = getSubCategories(category.id)

          return (
            <div key={category.id} className="glass-card bg-glass-bg-light p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{category.name}</h3>
                    <p className="text-sm text-muted">
                      {budgetCategories.find(b => b.id === category.budgetCategoryId)?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-primary font-semibold">
                      ${category.spentThisMonth.toLocaleString()}
                    </p>
                    {category.monthlyTarget && (
                      <p className={`text-xs ${getStatusColor(usage.status)}`}>
                        of ${category.monthlyTarget.toLocaleString()} ({usage.percentage.toFixed(0)}%)
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-muted text-center">
                    <p>{category.transactionCount}</p>
                    <p className="text-xs">transactions</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(category)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleUpdateCategory(category.id, { isActive: !category.isActive })}
                      className={`p-2 transition-colors ${
                        category.isActive ? 'text-success hover:text-warning' : 'text-muted hover:text-success'
                      }`}
                      title={category.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {category.isActive ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-muted hover:text-error transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {category.monthlyTarget && (
                <div className="w-full bg-glass-border/20 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usage.status === 'over' ? 'bg-error' :
                      usage.status === 'warning' ? 'bg-warning' :
                      usage.status === 'good' ? 'bg-success' : 'bg-muted'
                    }`}
                    style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                  />
                </div>
              )}

              {/* Sub-categories */}
              {subCategories.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-glass-border/30 space-y-2">
                  {subCategories.map(subCategory => {
                    const subUsage = getUsageStatus(subCategory)
                    return (
                      <div key={subCategory.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{subCategory.icon}</span>
                          <span className="text-primary">{subCategory.name}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-primary font-semibold">
                              ${subCategory.spentThisMonth.toLocaleString()}
                            </p>
                            {subCategory.monthlyTarget && (
                              <p className={`text-xs ${getStatusColor(subUsage.status)}`}>
                                of ${subCategory.monthlyTarget.toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="text-xs text-muted">
                            {subCategory.transactionCount} uses
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(subCategory)}
                              className="p-1 text-muted hover:text-primary transition-colors text-sm"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(subCategory.id)}
                              className="p-1 text-muted hover:text-error transition-colors text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filteredAndSortedCategories.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-muted">No categories found</p>
            <p className="text-sm text-muted mt-1">Adjust your filters or create a new category</p>
          </div>
        )}
      </div>

      {/* KGiQ Footer */}
      <div className="flex items-center justify-center mt-8 pt-6 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">📊</span>
          <span>Spending categorization powered by KGiQ Finance</span>
        </div>
      </div>
    </div>
  )
}