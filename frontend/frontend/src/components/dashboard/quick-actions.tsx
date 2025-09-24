'use client'

import Link from 'next/link'
import { useState } from 'react'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  url: string
  category: 'income' | 'expense' | 'budget' | 'account' | 'report'
  featured: boolean
  shortcut?: string
}

interface ActionCategory {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
}

const categories: ActionCategory[] = [
  {
    id: 'income',
    name: 'Income',
    icon: '💵',
    color: 'text-success',
    bgColor: 'bg-success/10'
  },
  {
    id: 'expense',
    name: 'Expenses',
    icon: '💸',
    color: 'text-error',
    bgColor: 'bg-error/10'
  },
  {
    id: 'budget',
    name: 'Budget',
    icon: '🎯',
    color: 'text-kgiq-primary',
    bgColor: 'bg-kgiq-primary/10'
  },
  {
    id: 'account',
    name: 'Accounts',
    icon: '🏦',
    color: 'text-kgiq-tertiary',
    bgColor: 'bg-kgiq-tertiary/10'
  },
  {
    id: 'report',
    name: 'Reports',
    icon: '📊',
    color: 'text-kgiq-secondary',
    bgColor: 'bg-kgiq-secondary/10'
  }
]

function ActionButton({ action }: { action: QuickAction }) {
  const category = categories.find(c => c.id === action.category)

  return (
    <Link
      href={action.url}
      className="glass-card p-4 hover:bg-glass-bg-light hover:shadow-glass-hover transition-all duration-200 group block"
    >
      <div className="flex items-start gap-3">
        {/* Action Icon */}
        <div className={`w-10 h-10 rounded-xl ${category?.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-lg">{action.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-primary font-medium text-sm group-hover:text-accent transition-colors duration-200">
              {action.title}
            </h3>

            {action.shortcut && (
              <span className="text-xs text-muted bg-glass-bg px-2 py-1 rounded font-mono">
                {action.shortcut}
              </span>
            )}
          </div>

          <p className="text-muted text-xs leading-relaxed mb-2">
            {action.description}
          </p>

          <div className="flex items-center justify-between">
            <span className={`text-xs ${category?.color} flex items-center gap-1`}>
              <span>{category?.icon}</span>
              {category?.name}
            </span>

            {action.featured && (
              <span className="text-xs text-kgiq-primary bg-kgiq-primary/10 px-2 py-0.5 rounded-full font-medium">
                Featured
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeaturedActions({ actions }: { actions: QuickAction[] }) {
  const featuredActions = actions.filter(action => action.featured)

  if (featuredActions.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        ⭐ Featured Actions
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {featuredActions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </div>
    </div>
  )
}

function CategoryActions({
  category,
  actions,
  expanded,
  onToggle
}: {
  category: ActionCategory
  actions: QuickAction[]
  expanded: boolean
  onToggle: () => void
}) {
  const categoryActions = actions.filter(action =>
    action.category === category.id && !action.featured
  )

  if (categoryActions.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 glass-card hover:bg-glass-bg-light transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${category.bgColor} flex items-center justify-center`}>
            <span>{category.icon}</span>
          </div>
          <div className="text-left">
            <h3 className="text-primary font-medium text-sm">{category.name}</h3>
            <p className="text-muted text-xs">{categoryActions.length} actions</p>
          </div>
        </div>
        <span className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 pl-4">
          {categoryActions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function QuickActions() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  // Mock quick actions data - in real app, this might be user-customizable
  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Add Income',
      description: 'Record a new income event or paycheck',
      icon: '💵',
      url: '/income/create',
      category: 'income',
      featured: true,
      shortcut: 'Ctrl+I'
    },
    {
      id: '2',
      title: 'Add Payment',
      description: 'Schedule a new payment or bill',
      icon: '💸',
      url: '/payments/create',
      category: 'expense',
      featured: true,
      shortcut: 'Ctrl+P'
    },
    {
      id: '3',
      title: 'Connect Bank',
      description: 'Link a new bank account for automatic sync',
      icon: '🏦',
      url: '/bank-accounts/connect',
      category: 'account',
      featured: true
    },
    {
      id: '4',
      title: 'View Calendar',
      description: 'See your cash flow calendar',
      icon: '📅',
      url: '/calendar',
      category: 'report',
      featured: false
    },
    {
      id: '5',
      title: 'Budget Overview',
      description: 'Review your budget performance',
      icon: '🎯',
      url: '/budget',
      category: 'budget',
      featured: false
    },
    {
      id: '6',
      title: 'Categorize Transactions',
      description: 'Review and categorize uncategorized transactions',
      icon: '🏷️',
      url: '/transactions/uncategorized',
      category: 'account',
      featured: false
    },
    {
      id: '7',
      title: 'Monthly Report',
      description: 'Generate your monthly financial summary',
      icon: '📊',
      url: '/reports/monthly',
      category: 'report',
      featured: false
    },
    {
      id: '8',
      title: 'Set Budget Goals',
      description: 'Update your budget categories and targets',
      icon: '🎯',
      url: '/budget/categories',
      category: 'budget',
      featured: false
    },
    {
      id: '9',
      title: 'Sync Bank Accounts',
      description: 'Manually sync all connected bank accounts',
      icon: '🔄',
      url: '/bank-accounts/sync-all',
      category: 'account',
      featured: false
    },
    {
      id: '10',
      title: 'Recurring Income',
      description: 'Set up recurring income events',
      icon: '🔁',
      url: '/income/recurring',
      category: 'income',
      featured: false
    },
    {
      id: '11',
      title: 'Bill Reminders',
      description: 'Manage your bill reminder settings',
      icon: '⏰',
      url: '/payments/reminders',
      category: 'expense',
      featured: false
    },
    {
      id: '12',
      title: 'Export Data',
      description: 'Export your financial data to CSV or PDF',
      icon: '📤',
      url: '/reports/export',
      category: 'report',
      featured: false
    }
  ]

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredActions = searchTerm
    ? quickActions.filter(action =>
        action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : quickActions

  const hasResults = filteredActions.length > 0

  return (
    <section className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
            ⚡ Quick Actions
          </h2>
          <p className="text-sm text-muted mt-1">Common tasks and shortcuts</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-muted text-sm">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 glass-card bg-glass-bg-light text-primary placeholder-muted text-sm rounded-lg border-glass-border focus:border-kgiq-primary focus:ring-1 focus:ring-kgiq-primary transition-all duration-200"
        />
      </div>

      {/* Results */}
      {!hasResults ? (
        <div className="text-center py-8 text-muted">
          <div className="text-4xl mb-2">🔍</div>
          <p>No actions found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      ) : searchTerm ? (
        /* Search Results */
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary mb-3">
            Search Results ({filteredActions.length})
          </h3>
          {filteredActions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      ) : (
        /* Normal Category View */
        <div>
          {/* Featured Actions */}
          <FeaturedActions actions={filteredActions} />

          {/* Category Sections */}
          {categories.map((category) => (
            <CategoryActions
              key={category.id}
              category={category}
              actions={filteredActions}
              expanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
            />
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      {!searchTerm && (
        <div className="mt-6 p-3 glass-card bg-glass-bg-light">
          <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
            ⌨️ Keyboard Shortcuts
          </h4>
          <div className="text-xs text-muted space-y-1">
            <div className="flex justify-between">
              <span>Add Income</span>
              <span className="font-mono bg-glass-bg px-2 py-1 rounded">Ctrl+I</span>
            </div>
            <div className="flex justify-between">
              <span>Add Payment</span>
              <span className="font-mono bg-glass-bg px-2 py-1 rounded">Ctrl+P</span>
            </div>
          </div>
        </div>
      )}

      {/* KGiQ Branding Footer */}
      <div className="flex items-center justify-center mt-6 pt-4 border-t border-glass-border/30">
        <div className="text-xs text-muted flex items-center gap-2">
          <span className="text-kgiq-primary">⚡</span>
          <span>Quick actions powered by KGiQ efficiency</span>
        </div>
      </div>
    </section>
  )
}