import Link from 'next/link'
import Image from 'next/image'

interface FooterProps {
  className?: string
}

export default function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`glass-card mt-12 ${className}`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left Section - Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6">
              <Image
                src="/assets/branding/KGiQ_logo_transparent.svg"
                alt="KGiQ"
                width={24}
                height={24}
                className="w-full h-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-primary font-semibold text-sm">KGiQ Family Finance</span>
              <span className="text-muted text-xs">Intelligent financial management</span>
            </div>
          </div>
        </div>

        {/* Center Section - Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link
            href="/reports"
            className="text-secondary hover:text-primary transition-colors"
          >
            Financial Reports
          </Link>
          <Link
            href="/budget/templates"
            className="text-secondary hover:text-primary transition-colors"
          >
            Budget Templates
          </Link>
          <Link
            href="/family/activity"
            className="text-secondary hover:text-primary transition-colors"
          >
            Activity Log
          </Link>
          <Link
            href="/bank-accounts"
            className="text-secondary hover:text-primary transition-colors"
          >
            Connected Banks
          </Link>
        </div>

        {/* Right Section - Status & Copyright */}
        <div className="flex flex-col lg:items-end items-center gap-2 text-sm">
          <div className="flex items-center gap-4">
            {/* System Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-muted text-xs">All systems operational</span>
            </div>

            {/* Data Sync Status */}
            <div className="flex items-center gap-2">
              <span className="text-lg animate-spin" style={{ animationDuration: '3s' }}>🔄</span>
              <span className="text-muted text-xs">Last sync: 2 min ago</span>
            </div>
          </div>

          <div className="text-muted text-xs text-center lg:text-right">
            <div>© {currentYear} KGiQ. All rights reserved.</div>
            <div className="flex items-center gap-1 mt-1">
              <span>Powered by</span>
              <span className="text-accent font-medium">KGiQ Intelligence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Privacy Footer */}
      <div className="border-t border-glass-border mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span role="img" aria-label="Secure">🔒</span>
            Bank-level encryption
          </span>
          <span className="flex items-center gap-1">
            <span role="img" aria-label="Private">🛡️</span>
            Your data stays private
          </span>
          <span className="flex items-center gap-1">
            <span role="img" aria-label="Backup">💾</span>
            Auto-backup enabled
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link href="/support" className="hover:text-primary transition-colors">
            Support
          </Link>
        </div>
      </div>
    </footer>
  )
}