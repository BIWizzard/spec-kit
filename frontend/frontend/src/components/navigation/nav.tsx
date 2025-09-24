'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

interface NavItem {
  href: string
  label: string
  icon: string
  description?: string
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', description: 'Overview & insights' },
  { href: '/income', label: 'Income', icon: '💰', description: 'Track earnings' },
  { href: '/payments', label: 'Payments', icon: '💳', description: 'Manage bills' },
  { href: '/budget', label: 'Budget', icon: '🎯', description: 'Plan spending' },
  { href: '/calendar', label: 'Calendar', icon: '📅', description: 'Cash flow timeline' },
  { href: '/reports', label: 'Reports', icon: '📈', description: 'Financial analysis' },
  { href: '/bank-accounts', label: 'Banks', icon: '🏦', description: 'Connected accounts' },
  { href: '/family', label: 'Family', icon: '👨‍👩‍👧‍👦', description: 'Member management' },
]

interface NavigationProps {
  collapsed?: boolean
  onToggle?: () => void
}

export default function Navigation({ collapsed = false, onToggle }: NavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="glass-sidebar">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/assets/branding/KGiQ_logo_transparent.svg"
                alt="KGiQ"
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-primary font-semibold text-lg">KGiQ</span>
                <span className="text-muted text-xs">Family Finance</span>
              </div>
            )}
          </Link>

          {onToggle && (
            <button
              onClick={onToggle}
              className="glass-button-ghost p-2 lg:hidden"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              <span className="text-lg">{collapsed ? '▶' : '◀'}</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="glass-nav">
            {navItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`glass-nav-item group ${isActive ? 'active' : ''}`}
                >
                  <span className="text-xl flex-shrink-0" role="img" aria-label={item.label}>
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted truncate group-hover:text-secondary transition-colors">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}

                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-kgiq-primary flex-shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Section */}
        {!collapsed && (
          <div className="p-4 border-t border-glass-border">
            <div className="glass-card-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-kgiq-primary flex items-center justify-center text-bg-primary font-semibold text-sm">
                  JD
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-primary text-sm font-medium truncate">John Doe</span>
                  <span className="text-muted text-xs truncate">Administrator</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}