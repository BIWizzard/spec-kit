import Link from 'next/link'
import Image from 'next/image'
import LoginForm from '../../components/auth/login-form'

export const metadata = {
  title: 'Sign In - KGiQ Family Finance',
  description: 'Sign in to your KGiQ Family Finance account',
}

export default function LoginPage() {
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
            Welcome back to KGiQ
          </h1>
          <p className="text-secondary text-sm">
            Sign in to manage your family finances with intelligent insights
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card">
          <LoginForm />
        </div>

        {/* Additional Links */}
        <div className="mt-6 text-center space-y-4">
          <div className="text-sm">
            <span className="text-secondary">Don't have an account? </span>
            <Link
              href="/register"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Create your KGiQ account
            </Link>
          </div>

          <div className="text-sm">
            <Link
              href="/forgot-password"
              className="text-secondary hover:text-primary transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 glass-card-sm bg-info/5 border-info/20">
          <div className="flex items-start gap-3">
            <span className="text-info text-lg flex-shrink-0">🛡️</span>
            <div className="text-xs text-secondary">
              <p className="font-semibold text-info mb-1">Your data is secure</p>
              <p>
                KGiQ uses bank-level encryption and never stores your banking credentials.
                Your financial data stays private and secure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}