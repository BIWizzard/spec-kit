'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  SwatchIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface BudgetCategory {
  id?: string
  name: string
  targetPercentage: number
  color: string
  sortOrder?: number
  isActive: boolean
  description?: string
}

interface CategoryFormProps {
  category?: BudgetCategory
  existingCategories: BudgetCategory[]
  onSave: (category: BudgetCategory) => void
  onCancel: () => void
  mode?: 'create' | 'edit' | 'duplicate'
  suggestedPercentage?: number
  maxPercentage?: number
  remainingPercentage?: number
  className?: string
}

const PRESET_COLORS = [
  '#FFD166', // Golden yellow (primary)
  '#8FAD77', // Sage green
  '#5E7F9B', // Blue-gray
  '#E76F51', // Coral
  '#2A9D8F', // Teal
  '#264653', // Dark teal
  '#F4A261', // Orange
  '#E9C46A', // Gold
  '#76C893', // Light green
  '#577590', // Steel blue
  '#F77F00', // Bright orange
  '#006466', // Dark cyan
]

const CATEGORY_TEMPLATES = [
  { name: 'Needs (Housing, Utilities)', percentage: 50, color: '#E76F51' },
  { name: 'Wants (Entertainment, Dining)', percentage: 30, color: '#FFD166' },
  { name: 'Savings & Investments', percentage: 20, color: '#8FAD77' },
  { name: 'Housing & Utilities', percentage: 25, color: '#264653' },
  { name: 'Transportation', percentage: 15, color: '#2A9D8F' },
  { name: 'Food & Groceries', percentage: 12, color: '#F4A261' },
  { name: 'Healthcare', percentage: 8, color: '#577590' },
  { name: 'Entertainment', percentage: 5, color: '#E9C46A' },
  { name: 'Personal Care', percentage: 3, color: '#76C893' },
  { name: 'Emergency Fund', percentage: 10, color: '#006466' },
  { name: 'Debt Payments', percentage: 15, color: '#F77F00' },
]

export default function CategoryForm({
  category,
  existingCategories,
  onSave,
  onCancel,
  mode = 'create',
  suggestedPercentage,
  maxPercentage = 100,
  remainingPercentage,
  className = ''
}: CategoryFormProps) {
  const [formData, setFormData] = useState<BudgetCategory>({
    name: '',
    targetPercentage: 0,
    color: PRESET_COLORS[0],
    isActive: true,
    description: ''
  })

  const [showTemplates, setShowTemplates] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (category) {
      setFormData({
        ...category,
        description: category.description || ''
      })
    } else if (suggestedPercentage) {
      setFormData(prev => ({
        ...prev,
        targetPercentage: suggestedPercentage
      }))
    }
  }, [category, suggestedPercentage])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Category name must be at least 2 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Category name must be less than 50 characters'
    }

    // Check for duplicate names
    const isDuplicate = existingCategories.some(cat =>
      cat.id !== category?.id &&
      cat.name.toLowerCase() === formData.name.toLowerCase().trim()
    )
    if (isDuplicate) {
      newErrors.name = 'A category with this name already exists'
    }

    if (formData.targetPercentage <= 0) {
      newErrors.targetPercentage = 'Percentage must be greater than 0'
    } else if (formData.targetPercentage > maxPercentage) {
      newErrors.targetPercentage = `Percentage cannot exceed ${maxPercentage}%`
    }

    // Check if total would exceed 100%
    const currentTotal = existingCategories
      .filter(cat => cat.id !== category?.id && cat.isActive)
      .reduce((sum, cat) => sum + cat.targetPercentage, 0)
    const newTotal = currentTotal + formData.targetPercentage

    if (newTotal > 100) {
      newErrors.targetPercentage = `This would make the total ${newTotal.toFixed(1)}%. Maximum is 100%.`
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const categoryToSave: BudgetCategory = {
        ...formData,
        name: formData.name.trim(),
        id: mode === 'duplicate' ? undefined : category?.id
      }

      await onSave(categoryToSave)
    } catch (error) {
      console.error('Error saving category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTemplateSelect = (template: typeof CATEGORY_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      targetPercentage: Math.min(template.percentage, remainingPercentage || template.percentage),
      color: template.color
    }))
    setShowTemplates(false)
  }

  const currentTotal = existingCategories
    .filter(cat => cat.id !== category?.id && cat.isActive)
    .reduce((sum, cat) => sum + cat.targetPercentage, 0)
  const projectedTotal = currentTotal + formData.targetPercentage

  return (
    <div className={`glassmorphic p-6 rounded-lg border border-white/10 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {mode === 'create' && 'Create Budget Category'}
          {mode === 'edit' && 'Edit Budget Category'}
          {mode === 'duplicate' && 'Duplicate Budget Category'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Category Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            placeholder="e.g., Housing & Utilities"
            maxLength={50}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-error">{errors.name}</p>
          )}

          {mode === 'create' && (
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="mt-2 text-sm text-primary hover:text-primary/80"
            >
              Choose from templates
            </button>
          )}
        </div>

        {/* Templates Dropdown */}
        {showTemplates && (
          <div className="glassmorphic p-4 rounded-lg border border-white/10">
            <h4 className="text-sm font-medium text-white mb-3">Category Templates</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {CATEGORY_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="flex items-center justify-between p-2 hover:bg-white/5 rounded text-left transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="text-sm text-white">{template.name}</span>
                  </div>
                  <span className="text-sm text-gray-400">{template.percentage}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Target Percentage */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Target Percentage
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              max={maxPercentage}
              step="0.1"
              value={formData.targetPercentage || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                targetPercentage: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              placeholder="0.0"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              %
            </span>
          </div>
          {errors.targetPercentage && (
            <p className="mt-1 text-sm text-error">{errors.targetPercentage}</p>
          )}

          {/* Percentage Info */}
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Current total:</span>
              <span>{currentTotal.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Projected total:</span>
              <span className={projectedTotal > 100 ? 'text-error' : 'text-gray-400'}>
                {projectedTotal.toFixed(1)}%
              </span>
            </div>
            {remainingPercentage !== undefined && (
              <div className="flex justify-between text-gray-400">
                <span>Available:</span>
                <span>{remainingPercentage.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Category Color
          </label>
          <div className="grid grid-cols-6 gap-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  formData.color === color
                    ? 'border-white ring-2 ring-primary/50'
                    : 'border-white/20 hover:border-white/40'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Custom color input */}
          <div className="mt-3 flex items-center space-x-3">
            <label className="text-sm text-gray-400">Custom:</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-10 h-10 bg-transparent border border-white/20 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-400 font-mono">
              {formData.color.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            maxLength={200}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
            placeholder="Add notes about this category..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-error">{errors.description}</p>
          )}
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>Additional details about what this category includes</span>
            <span>{formData.description?.length || 0}/200</span>
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
          />
          <label htmlFor="isActive" className="text-sm text-white">
            Active category (will be included in budget calculations)
          </label>
        </div>

        {/* Warning Messages */}
        {projectedTotal > 100 && (
          <div className="flex items-center space-x-2 p-3 bg-error/10 border border-error/20 rounded-lg">
            <InformationCircleIcon className="w-5 h-5 text-error flex-shrink-0" />
            <p className="text-sm text-error">
              This category would make your total budget exceed 100%.
              Consider reducing other categories first.
            </p>
          </div>
        )}

        {projectedTotal === 100 && formData.targetPercentage > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm text-success">
              Perfect! This will complete your 100% budget allocation.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="px-6 py-2 bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Category' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  )
}