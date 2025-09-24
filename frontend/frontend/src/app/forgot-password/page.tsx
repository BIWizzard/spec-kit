import Link from 'next/link'
import Image from 'next/image'
import ForgotPasswordForm from '../../components/auth/forgot-password-form'

export const metadata = {
  title: 'Reset Password - KGiQ Family Finance',
  description: 'Reset your KGiQ Family Finance account password',
}

export default function ForgotPasswordPage() {
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
            Reset Your Password
          </h1>
          <p className="text-secondary text-sm">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="glass-card">
          <ForgotPasswordForm />
        </div>

        {/* Navigation Links */}
        <div className="mt-6 text-center space-y-4">
          <div className="text-sm">
            <span className="text-secondary">Remember your password? </span>
            <Link
              href="/login"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Sign in to KGiQ
            </Link>
          </div>

          <div className="text-sm">
            <span className="text-secondary">Don't have an account? </span>
            <Link
              href="/register"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Help Information */}
        <div className="mt-8 glass-card-sm bg-warning/5 border-warning/20">
          <div className="flex items-start gap-3">
            <span className="text-warning text-lg flex-shrink-0">💡</span>
            <div className="text-xs text-secondary">
              <p className="font-semibold text-warning mb-1">Need help?</p>
              <p>
                If you don't receive an email within a few minutes, check your spam folder
                or contact our support team at{' '}
                <a href="mailto:support@kgiq.dev" className="text-accent hover:underline">
                  support@kgiq.dev
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}