const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  // Other Next.js config options
}

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true, // Suppresses source map uploading logs during build

  // Upload source maps
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: process.env.NODE_ENV === 'production',

  // Disable automatic release detection in CI environments
  automaticVercelMonitors: false,
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = process.env.SENTRY_DSN ?
  withSentryConfig(nextConfig, sentryWebpackPluginOptions) :
  nextConfig