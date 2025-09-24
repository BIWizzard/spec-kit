import Link from 'next/link'
import Image from 'next/image'
import EmailVerification from '../../components/auth/email-verification'
import { Suspense } from 'react'

export const metadata = {
  title: 'Verify Email - KGiQ Family Finance',
  description: 'Verify your email address for your KGiQ Family Finance account',
}

// Wrapper component to handle search params
function EmailVerificationContent() {
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
            Verify Your Email
          </h1>
          <p className="text-secondary text-sm">
            We need to verify your email address to secure your KGiQ account
          </p>
        </div>

        {/* Email Verification Component */}
        <div className="glass-card">
          <EmailVerification />
        </div>

        {/* Navigation Links */}
        <div className="mt-6 text-center">
          <div className="text-sm">
            <span className="text-secondary">Need to sign in? </span>
            <Link
              href="/login"
              className="text-accent hover:text-primary transition-colors font-medium"
            >
              Go to sign in
            </Link>
          </div>
        </div>

        {/* Help Information */}
        <div className="mt-8 space-y-4">
          <div className="glass-card-sm bg-success/5 border-success/20">
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0">✅</span>
              <div className="text-xs text-secondary">
                <p className="font-semibold text-success mb-1">Why verify your email?</p>
                <ul className="space-y-1">
                  <li>• Secure account recovery options</li>
                  <li>• Important security notifications</li>
                  <li>• Family member invitations</li>
                  <li>• Budget alerts and reports</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="glass-card-sm bg-warning/5 border-warning/20">
            <div className="flex items-start gap-3">
              <span className="text-warning text-lg flex-shrink-0">📧</span>
              <div className="text-xs text-secondary">
                <p className="font-semibold text-warning mb-1">Didn't receive the email?</p>
                <p>
                  Check your spam folder or wait a few minutes. If you still don't see it,
                  you can request a new verification email above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin text-accent text-2xl mb-4">⟳</div>
          <p className="text-secondary">Loading verification...</p>
        </div>
      </div>
    }>
      <EmailVerificationContent />
    </Suspense>
  )
}