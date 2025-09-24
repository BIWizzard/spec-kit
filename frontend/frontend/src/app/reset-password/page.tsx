import Link from 'next/link'
import Image from 'next/image'
import ResetPasswordForm from '../../components/auth/reset-password-form'
import { Suspense } from 'react'

export const metadata = {
  title: 'Set New Password - KGiQ Family Finance',
  description: 'Set a new password for your KGiQ Family Finance account',
}

// Wrapper component to handle search params
function ResetPasswordContent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* KGiQ Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              <Image
                src="/assets/branding/KGiQ_logo_transparent.svg"
                alt="KGiQ"
                width={64}
                height={64}
                className="w-full h-full"
              />
            </div>
          </div>

          <h1 className="text-primary text-2xl font-bold mb-2">
            Set New Password
          </h1>
          <p className="text-secondary text-sm">
            Create a strong, secure password for your KGiQ account
          </p>
        </div>

        {/* Reset Password Form */}
        <div className="glass-card">
          <ResetPasswordForm />
        </div>

        {/* Navigation Links */}
        <div className="mt-6 text-center">
          <div className="text-sm">
            <span className="text-secondary">Remember your password? </span>
            <Link
              href="/login"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Sign in to KGiQ
            </Link>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="mt-8 glass-card-sm bg-info/5 border-info/20">
          <div className="flex items-start gap-3">
            <span className="text-info text-lg flex-shrink-0">🔐</span>
            <div className="text-xs text-secondary">
              <p className="font-semibold text-info mb-2">Password Requirements:</p>
              <ul className="space-y-1">
                <li>• At least 12 characters long</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include at least one number</li>
                <li>• Include at least one special character</li>
                <li>• Avoid common passwords and personal information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin text-accent text-2xl mb-4">⟳</div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}