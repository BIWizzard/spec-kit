'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface User {
  name: string
  email: string
  role: string
  avatar?: string
  initials: string
}

interface HeaderProps {
  user?: User
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogoutClick?: () => void
}

export default function Header({
  user = {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Administrator',
    initials: 'JD'
  },
  onProfileClick,
  onSettingsClick,
  onLogoutClick
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications] = useState([
    { id: 1, text: 'Monthly budget review due', type: 'warning', unread: true },
    { id: 2, text: 'Bank sync completed', type: 'success', unread: true },
    { id: 3, text: 'Payment due in 3 days', type: 'info', unread: false },
  ])
  const pathname = usePathname()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const unreadNotifications = notifications.filter(n => n.unread).length
  const pageTitle = getPageTitle(pathname)

  return (
    <header className={`glass-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Logo & Title */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/assets/branding/KGiQ_logo_transparent.svg"
                alt="KGiQ"
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-primary font-semibold text-lg">KGiQ</span>
              <span className="text-muted text-xs">Family Finance</span>
            </div>
          </Link>

          <div className="hidden lg:block w-px h-6 bg-glass-border" />

          <h1 className="hidden lg:block text-primary text-xl font-semibold">
            {pageTitle}
          </h1>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button className="glass-button-ghost p-2 relative">
              <span className="text-lg" role="img" aria-label="Notifications">🔔</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white text-xs font-semibold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/income/create" className="glass-button-primary text-sm px-3 py-2">
              + Income
            </Link>
            <Link href="/payments/create" className="glass-button-ghost text-sm px-3 py-2">
              + Payment
            </Link>
          </div>

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 glass-button-ghost"
            >
              <div className="w-8 h-8 rounded-full bg-kgiq-primary flex items-center justify-center text-bg-primary font-semibold text-sm">
                {user.initials}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-primary text-sm font-medium">{user.name}</span>
                <span className="text-muted text-xs">{user.role}</span>
              </div>
              <span className="text-muted text-sm">{showUserMenu ? '▲' : '▼'}</span>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 glass-card p-0 z-50">
                <div className="p-4 border-b border-glass-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kgiq-primary flex items-center justify-center text-bg-primary font-semibold">
                      {user.initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-primary font-medium truncate">{user.name}</span>
                      <span className="text-muted text-sm truncate">{user.email}</span>
                      <span className="text-accent text-xs">{user.role}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      onProfileClick?.()
                      setShowUserMenu(false)
                    }}
                    className="w-full glass-nav-item text-left"
                  >
                    <span className="text-lg">👤</span>
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      onSettingsClick?.()
                      setShowUserMenu(false)
                    }}
                    className="w-full glass-nav-item text-left"
                  >
                    <span className="text-lg">⚙️</span>
                    <span>Family Settings</span>
                  </button>

                  <Link href="/family" className="w-full glass-nav-item">
                    <span className="text-lg">👨‍👩‍👧‍👦</span>
                    <span>Family Members</span>
                  </Link>

                  <div className="border-t border-glass-border mt-2 pt-2">
                    <button
                      onClick={() => {
                        onLogoutClick?.()
                        setShowUserMenu(false)
                      }}
                      className="w-full glass-nav-item text-left text-error"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function getPageTitle(pathname: string): string {
  const routes: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/income': 'Income Events',
    '/payments': 'Payments & Bills',
    '/budget': 'Budget Planning',
    '/calendar': 'Cash Flow Calendar',
    '/reports': 'Financial Reports',
    '/bank-accounts': 'Bank Accounts',
    '/transactions': 'Transactions',
    '/family': 'Family Management',
  }

  // Check for exact match first
  if (routes[pathname]) {
    return routes[pathname]
  }

  // Check for nested routes
  for (const route in routes) {
    if (pathname.startsWith(route)) {
      return routes[route]
    }
  }

  return 'KGiQ Family Finance'
}