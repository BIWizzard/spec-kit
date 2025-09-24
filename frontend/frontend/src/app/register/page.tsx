import Link from 'next/link'
import Image from 'next/image'
import RegisterForm from '../../components/auth/register-form'

export const metadata = {
  title: 'Create Account - KGiQ Family Finance',
  description: 'Create your KGiQ Family Finance account to start managing your family finances',
}

export default function RegisterPage() {
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
            Join KGiQ Family Finance
          </h1>
          <p className="text-secondary text-sm">
            Create your account and start managing your family finances with intelligent insights
          </p>
        </div>

        {/* Register Form */}
        <div className="glass-card">
          <RegisterForm />
        </div>

        {/* Additional Links */}
        <div className="mt-6 text-center">
          <div className="text-sm">
            <span className="text-secondary">Already have an account? </span>
            <Link
              href="/login"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Sign in to KGiQ
            </Link>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="mt-8 space-y-3">
          <h3 className="text-primary font-semibold text-sm text-center mb-4">
            What you get with KGiQ:
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <div className="glass-card-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">💰</span>
                <div>
                  <p className="text-primary font-medium text-sm">Smart Income Tracking</p>
                  <p className="text-muted text-xs">Automatically categorize and predict income events</p>
                </div>
              </div>
            </div>

            <div className="glass-card-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-primary font-medium text-sm">Intelligent Budgeting</p>
                  <p className="text-muted text-xs">AI-powered budget recommendations and insights</p>
                </div>
              </div>
            </div>

            <div className="glass-card-sm">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏦</span>
                <div>
                  <p className="text-primary font-medium text-sm">Bank Integration</p>
                  <p className="text-muted text-xs">Securely connect all your accounts in one place</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-muted">
          <p>
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}