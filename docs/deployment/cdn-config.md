# CDN Configuration for Static Assets

## Overview
This document outlines the CDN configuration for optimizing static asset delivery in the Family Finance web application.

## Configuration Components

### 1. Vercel CDN Settings
Location: `/vercel.json`

#### Image Optimization
- **Formats**: WebP and AVIF for modern browsers
- **Cache TTL**: 1 year (31536000 seconds) for images
- **Security**: SVG disabled for security, CSP applied

#### Static Asset Caching
- **JavaScript/CSS**: 1 year cache with immutable flag
- **Fonts**: 1 year cache (woff, woff2, ttf, eot)
- **Images**: 1 year cache (png, jpg, jpeg, gif, svg, webp, avif)
- **Next.js Static**: 1 year cache for `_next/static/*`
- **Favicon**: 1 day cache for favicon.ico

### 2. Next.js Configuration
Location: `/frontend/next.config.js`

#### Features Enabled
- **Compression**: Gzip/Brotli compression enabled
- **ETag Generation**: Automatic ETag headers for caching validation
- **Powered-By Header**: Disabled for security
- **Image Optimization**: WebP/AVIF conversion with 1-year cache

#### Header Rules
- Static assets: `public, max-age=31536000, immutable`
- Next.js static files: `public, max-age=31536000, immutable`

## Performance Benefits

### Cache Duration Strategy
- **Static Assets**: 1 year cache reduces bandwidth and improves load times
- **Immutable Flag**: Prevents unnecessary revalidation requests
- **Favicon**: Shorter cache (1 day) allows for quick branding updates

### Format Optimization
- **WebP**: ~25-30% smaller than JPEG
- **AVIF**: ~50% smaller than JPEG (when supported)
- **Automatic Fallback**: Browser-based format selection

### Security Considerations
- **SVG Disabled**: Prevents XSS attacks through malicious SVGs
- **Content Security Policy**: Applied to images for additional security
- **X-Content-Type-Options**: nosniff prevents MIME confusion attacks

## Monitoring
- Use Vercel Analytics to monitor asset delivery performance
- Monitor cache hit ratios and bandwidth usage
- Track Core Web Vitals improvements from CDN optimization

## Environment-Specific Settings
- **Production**: Full CDN optimization enabled
- **Development**: Local serving with reduced caching for hot reload
- **Preview**: CDN enabled for realistic performance testing