'use client'

import { useState } from 'react'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SwatchIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

interface BudgetCategory {
  id: string
  name: string
  targetPercentage: number
  color: string
  sortOrder: number
  isActive: boolean
  currentSpend?: number
  projectedSpend?: number
  variance?: number
  lastUpdated?: string
}

interface CategoriesListProps {
  categories: BudgetCategory[]
  onEdit: (category: BudgetCategory) => void
  onDelete: (categoryId: string) => void
  onToggleActive: (categoryId: string) => void
  onReorder: (categoryId: string, direction: 'up' | 'down') => void
  onAdd: () => void
  viewMode?: 'grid' | 'list'
  showInactive?: boolean
  sortBy?: 'name' | 'percentage' | 'order' | 'variance'
  readonly?: boolean
  enableDragDrop?: boolean
  className?: string
}

export default function CategoriesList({
  categories,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
  onAdd,
  viewMode = 'list',
  showInactive = true,
  sortBy = 'order',
  readonly = false,
  enableDragDrop = false,
  className = ''
}: CategoriesListProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const getSortedCategories = (categories: BudgetCategory[]) => {
    const filtered = showInactive ? categories : categories.filter(cat => cat.isActive)

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'percentage':
          return b.targetPercentage - a.targetPercentage
        case 'variance':
          return Math.abs(b.variance || 0) - Math.abs(a.variance || 0)
        case 'order':
        default:
          return a.sortOrder - b.sortOrder
      }
    })
  }

  const sortedCategories = getSortedCategories(categories)
  const totalPercentage = categories.reduce((sum, cat) => sum + (cat.isActive ? cat.targetPercentage : 0), 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01

  const handleCategorySelect = (categoryId: string, selected: boolean) => {
    const newSelected = new Set(selectedCategories)
    if (selected) {
      newSelected.add(categoryId)
    } else {
      newSelected.delete(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const handleDragStart = (categoryId: string) => {
    if (enableDragDrop && !readonly) {
      setDraggedItem(categoryId)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== targetId) {
      // Handle reordering logic here
      setDraggedItem(null)
    }
  }

  const getVarianceStatus = (variance?: number) => {
    if (!variance) return 'neutral'
    if (Math.abs(variance) <= 5) return 'good'
    if (Math.abs(variance) <= 15) return 'warning'
    return 'danger'
  }

  const renderCategoryCard = (category: BudgetCategory) => {
    const varianceStatus = getVarianceStatus(category.variance)

    return (
      <div
        key={category.id}
        className={`glassmorphic p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 ${
          selectedCategories.has(category.id) ? 'ring-2 ring-primary/50' : ''
        } ${!category.isActive ? 'opacity-60' : ''} ${
          draggedItem === category.id ? 'opacity-50' : ''
        }`}
        draggable={enableDragDrop && !readonly}
        onDragStart={() => handleDragStart(category.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, category.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!readonly && (
              <input
                type="checkbox"
                checked={selectedCategories.has(category.id)}
                onChange={(e) => handleCategorySelect(category.id, e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
              />
            )}

            <div
              className="w-4 h-4 rounded-full border border-white/20"
              style={{ backgroundColor: category.color }}
            />

            <div>
              <h3 className="font-medium text-white">{category.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{category.targetPercentage}%</span>
                {category.currentSpend !== undefined && (
                  <span>• ${category.currentSpend.toLocaleString()}</span>
                )}
                {category.variance !== undefined && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    varianceStatus === 'good' ? 'bg-success/20 text-success' :
                    varianceStatus === 'warning' ? 'bg-warning/20 text-warning' :
                    varianceStatus === 'danger' ? 'bg-error/20 text-error' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {category.variance > 0 ? '+' : ''}{category.variance}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!readonly && (
              <>
                <button
                  onClick={() => onToggleActive(category.id)}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  title={category.isActive ? 'Hide category' : 'Show category'}
                >
                  {category.isActive ? (
                    <EyeIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <button
                  onClick={() => onReorder(category.id, 'up')}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  disabled={category.sortOrder === 0}
                >
                  <ArrowUpIcon className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => onReorder(category.id, 'down')}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  disabled={category.sortOrder === categories.length - 1}
                >
                  <ArrowDownIcon className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => onEdit(category)}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                >
                  <PencilIcon className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => onDelete(category.id)}
                  className="p-1.5 rounded-md hover:bg-error/20 text-error transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {category.projectedSpend !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>{((category.currentSpend || 0) / category.projectedSpend * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{
                  width: `${Math.min(((category.currentSpend || 0) / category.projectedSpend * 100), 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderListView = () => (
    <div className="space-y-3">
      {sortedCategories.map(renderCategoryCard)}
    </div>
  )

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedCategories.map(renderCategoryCard)}
    </div>
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Budget Categories</h2>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-400">
              {categories.filter(c => c.isActive).length} active categories
            </span>
            <div className={`flex items-center space-x-1 ${
              isValidTotal ? 'text-success' : 'text-warning'
            }`}>
              {isValidTotal ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4" />
              )}
              <span>Total: {totalPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {!readonly && (
          <button
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Category
          </button>
        )}
      </div>

      {/* Bulk Actions */}
      {!readonly && selectedCategories.size > 0 && (
        <div className="glassmorphic p-3 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedCategories.size} categories selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="text-sm text-primary hover:text-primary/80">
                Bulk Edit
              </button>
              <button className="text-sm text-error hover:text-error/80">
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {sortedCategories.length > 0 ? (
        viewMode === 'grid' ? renderGridView() : renderListView()
      ) : (
        <div className="glassmorphic p-8 rounded-lg border border-white/10 text-center">
          <SwatchIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Budget Categories</h3>
          <p className="text-gray-400 mb-4">
            Create your first budget category to start organizing your finances.
          </p>
          {!readonly && (
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add First Category
            </button>
          )}
        </div>
      )}
    </div>
  )
}