# Troubleshooting Session Notes - Landing Page Errors
**Date**: September 25, 2025
**Issue**: Landing page hydration and webpack module loading errors
**Status**: PARTIALLY RESOLVED

## Original Problem
- **Error Type 1**: Hydration error - "There was an error while hydrating"
- **Error Type 2**: Webpack module loading error - "Cannot read properties of undefined (reading 'call')"
- **Symptoms**: Landing page would flash briefly then crash with errors

## Root Cause Identified
**TanStack React Query (@tanstack/react-query) is causing webpack module loading issues**

## Tests Performed & Results

### ✅ WORKING SOLUTIONS
1. **Minimal Layout**: Landing page works when layout contains only:
   - Basic HTML structure
   - Next.js font loading (Inter)
   - CSS imports (globals.css, design-tokens.css, glassmorphism.css)
   - Tailwind background classes instead of CSS custom properties

### ❌ BROKEN COMPONENTS (cause webpack errors)
1. **QueryProvider**: Any import/usage of `@tanstack/react-query` breaks the app
   - Tried: `QueryProvider` from `../lib/react-query.tsx`
   - Tried: `QueryProviderMinimal` without ReactQueryDevtools
   - Tried: Client-only wrapper with useEffect mounting
   - **Result**: All approaches with React Query cause webpack module loading errors

### 🔄 UNTESTED COMPONENTS (removed during troubleshooting)
1. **ErrorBoundary**: `../components/ui/error-boundary.tsx` - removed early, unknown if problematic
2. **Vercel Analytics**: `@vercel/analytics/react` - commented out, untested
3. **Vercel Speed Insights**: `@vercel/speed-insights/next` - commented out, untested

## Configuration Changes Attempted

### CSS Custom Properties → Tailwind Classes ✅ WORKING
- **Changed**: `style={{ background: linear-gradient(var(--bg-primary)...) }}`
- **To**: `className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"`
- **Result**: Fixed initial hydration error

### Next.js Webpack Configuration ❌ NOT WORKING
- **Attempted**: Added React Query sideEffects rule to webpack config
- **Attempted**: Applied webpack fix to both dev and production builds
- **Result**: Changes work on running server but fail on server restart
- **Issue**: Webpack config not consistently applied or cached incorrectly

## Current Working State
```tsx
// layout.tsx - WORKING VERSION
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/assets/branding/KGiQ_logo_transparent.svg" />
        <meta name="theme-color" content="#FFD166" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>
        {/* NO QueryProvider - causes webpack errors */}
        <div className="min-h-screen relative">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />
          <main className="relative z-10">
            {children}
          </main>
        </div>
        {/* Analytics/SpeedInsights commented out - untested */}
      </body>
    </html>
  )
}
```

## Package Versions
- Next.js: 14.2.33 **⚠️ OUTDATED** (Latest: 15.5.4)
- @tanstack/react-query: 5.90.2
- @tanstack/react-query-devtools: 5.90.2

## 🎯 LIKELY ROOT CAUSE DISCOVERED
**Next.js version is severely outdated (major version behind)**
- Current: 14.2.33
- Latest: 15.5.4
- **Theory**: Webpack 5 module resolution improvements in Next.js 15 likely fix the React Query compatibility issues

## Server Restart Issues
- **Problem**: Ctrl+C doesn't properly kill Next.js dev servers
- **Evidence**: Ports 3000, 3001 remain in use after Ctrl+C
- **Workaround**: `lsof -ti:3000,3001,3002 | xargs kill -9`

## Next Steps for Future Sessions
1. **🎯 HIGH PRIORITY: Upgrade Next.js**:
   - Upgrade from 14.2.33 → 15.5.4
   - This will likely fix the React Query webpack issues
   - **Command**: `npm install next@latest`
   - **Risk**: May require code changes for breaking changes

2. **Test React Query after upgrade**:
   - Re-enable QueryProvider after Next.js upgrade
   - Verify all React Query functionality works
   - Add back ReactQueryDevtools if needed

3. **Add back components incrementally** (after Next.js upgrade):
   - Test ErrorBoundary
   - Test Vercel Analytics/SpeedInsights
   - Verify which components work with restored QueryProvider

3. **Navigation testing**:
   - All 8 main routes previously worked (dashboard, income, payments, budget, calendar, reports, bank-accounts, family)
   - Verify they still work without QueryProvider
   - Identify which pages depend on data fetching

## Files Modified During Session
- `frontend/src/app/layout.tsx` - Multiple changes, currently minimal working version
- `frontend/next.config.js` - Added React Query webpack rules (may not be working)
- `frontend/src/components/providers/client-providers.tsx` - Created but unused
- `frontend/src/lib/react-query-minimal.tsx` - Created but causes errors
- `frontend/src/lib/react-query-dynamic.tsx` - Created but unused
- `frontend/src/components/providers/client-only-query-provider.tsx` - Created but causes errors

## Commented Out Code Locations
All problematic imports/components are commented with explanatory notes for easy restoration:
- CSS custom properties in layout.tsx (can be restored if needed)
- QueryProvider imports and usage
- ErrorBoundary imports and usage
- Analytics/SpeedInsights imports and usage