import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Inter } from 'next/font/google'
import ErrorBoundary from '../components/ui/error-boundary'
import { QueryProvider } from '../lib/react-query'
import './globals.css'
import '../styles/design-tokens.css'
import '../styles/components/glassmorphism.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata = {
  title: 'KGiQ Family Finance',
  description: 'Intelligent family finance management powered by KGiQ',
  keywords: ['family finance', 'budgeting', 'KGiQ', 'financial planning'],
  authors: [{ name: 'KGiQ' }],
  creator: 'KGiQ',
  publisher: 'KGiQ',
  metadataBase: new URL('https://family-finance.kgiq.dev'),
  openGraph: {
    title: 'KGiQ Family Finance',
    description: 'Intelligent family finance management powered by KGiQ',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/assets/branding/KGiQ_logo_transparent.svg" />
        <meta name="theme-color" content="#FFD166" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}
        // Commented out original CSS custom properties for hydration debugging - can roll back if needed
        // style={{
        //   background: `linear-gradient(135deg,
        //     var(--bg-primary) 0%,
        //     var(--bg-secondary) 50%,
        //     var(--bg-tertiary) 100%)`
        // }}
      >
        <ErrorBoundary>
          <QueryProvider>
            <div className="min-h-screen relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />
              <main className="relative z-10">
                {children}
              </main>
            </div>
          </QueryProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}