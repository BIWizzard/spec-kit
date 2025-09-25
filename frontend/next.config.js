const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // instrumentationHook: true, // Temporarily disabled
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
    optimizeCss: true,
    scrollRestoration: true,
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Core Web Vitals Optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimizations
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [], // Add external image domains here if needed
  },

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Bundle analyzer (uncomment to analyze)
      // config.plugins.push(new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)())

      // Tree shaking optimizations
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            }
          }
        }
      }

      // Compression
      config.plugins.push(
        new webpack.optimize.AggressiveMergingPlugin()
      )
    }

    return config
  },

  // Performance headers
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/(.*)\\.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Redirects for performance
  async redirects() {
    return []
  },

  // Rewrites for API optimization
  async rewrites() {
    return []
  },
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
// Temporarily disable Sentry for development
module.exports = nextConfig