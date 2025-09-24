'use client'

import { useState, useEffect } from 'react'
import Navigation from './nav'

interface SidebarProps {
  children: React.ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(false)
        setIsMobileOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileOpen])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  return (
    <div className="flex min-h-screen">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="glass-sidebar-overlay active lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <div className={isCollapsed ? 'collapsed' : ''}>
          <Navigation
            collapsed={isCollapsed}
            onToggle={() => setIsCollapsed(!isCollapsed)}
          />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Navigation
          collapsed={false}
          onToggle={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        isCollapsed ? 'lg:ml-20' : 'lg:ml-70'
      }`}>
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden glass-header flex items-center justify-between px-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="glass-button-ghost p-2"
            aria-label="Open navigation menu"
          >
            <span className="text-xl">☰</span>
          </button>

          <div className="text-primary font-semibold text-lg">KGiQ Family Finance</div>

          <div className="w-10" />
        </div>

        {/* Desktop Toggle Button */}
        <div className="hidden lg:block">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="fixed top-4 left-4 z-40 glass-button-ghost p-2 transition-all duration-300"
            style={{
              left: isCollapsed ? '88px' : '288px'
            }}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-lg">{isCollapsed ? '▶' : '◀'}</span>
          </button>
        </div>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}