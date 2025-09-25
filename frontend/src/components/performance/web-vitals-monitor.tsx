/**
 * Web Vitals Performance Monitor Component
 * Task: T448 - Frontend performance optimization (Core Web Vitals)
 *
 * Real-time performance monitoring component for Core Web Vitals
 * with visual feedback and performance recommendations.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useWebVitals, PerformanceData, PERFORMANCE_THRESHOLDS } from '@/lib/web-vitals';

interface WebVitalsDisplayProps {
  showRecommendations?: boolean;
  minimized?: boolean;
  className?: string;
}

const WebVitalsMonitor: React.FC<WebVitalsDisplayProps> = ({
  showRecommendations = false,
  minimized = false,
  className = ''
}) => {
  const { getMetrics, getSummary, subscribe } = useWebVitals();
  const [metrics, setMetrics] = useState<Map<string, PerformanceData>>(new Map());
  const [summary, setSummary] = useState(getSummary());
  const [isVisible, setIsVisible] = useState(!minimized);

  useEffect(() => {
    // Subscribe to performance updates
    const unsubscribe = subscribe((data: PerformanceData) => {
      setMetrics(getMetrics());
      setSummary(getSummary());
    });

    // Initial load
    setMetrics(getMetrics());
    setSummary(getSummary());

    return unsubscribe;
  }, []);

  const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatValue = (metric: string, value: number): string => {
    switch (metric) {
      case 'LCP':
      case 'FCP':
      case 'TTFB':
        return `${(value / 1000).toFixed(2)}s`;
      case 'FID':
        return `${value.toFixed(0)}ms`;
      case 'CLS':
        return value.toFixed(3);
      default:
        return value.toFixed(2);
    }
  };

  const getThresholdInfo = (metric: string): { good: string; poor: string } => {
    const thresholds = PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!thresholds) return { good: 'N/A', poor: 'N/A' };

    switch (metric) {
      case 'LCP':
      case 'FCP':
      case 'TTFB':
        return {
          good: `≤${(thresholds.GOOD / 1000).toFixed(1)}s`,
          poor: `>${(thresholds.NEEDS_IMPROVEMENT / 1000).toFixed(1)}s`
        };
      case 'FID':
        return {
          good: `≤${thresholds.GOOD}ms`,
          poor: `>${thresholds.NEEDS_IMPROVEMENT}ms`
        };
      case 'CLS':
        return {
          good: `≤${thresholds.GOOD}`,
          poor: `>${thresholds.NEEDS_IMPROVEMENT}`
        };
      default:
        return { good: 'N/A', poor: 'N/A' };
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Metrics"
      >
        📊 Performance
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 max-w-md bg-white rounded-lg shadow-xl border z-50 ${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📊 Core Web Vitals
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(summary.overallRating)}`}
            >
              {summary.overallRating.toUpperCase()}
            </span>
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Hide Performance Metrics"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(summary.coreWebVitals).map(([metric, data]) => {
            const thresholds = getThresholdInfo(metric);

            return (
              <div key={metric} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getRatingColor(data.rating)}`}
                    >
                      {data.rating}
                    </span>
                  </div>
                  <span className="font-mono text-lg">
                    {formatValue(metric, data.value)}
                  </span>
                </div>

                <div className="text-xs text-gray-600 flex justify-between">
                  <span>Good: {thresholds.good}</span>
                  <span>Poor: {thresholds.poor}</span>
                </div>

                {/* Visual progress bar */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      data.rating === 'good' ? 'bg-green-500' :
                      data.rating === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (data.value / (PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS]?.NEEDS_IMPROVEMENT || 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {showRecommendations && summary.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2 text-yellow-700">💡 Recommendations</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              {summary.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            {summary.recommendations.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{summary.recommendations.length - 3} more recommendations
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2 text-xs">
          <button
            onClick={() => {
              const data = metrics;
              const blob = new Blob([JSON.stringify(Array.from(data.entries()), null, 2)], {
                type: 'application/json'
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'web-vitals-report.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            📥 Export
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

// Performance status indicator for header/navbar
export const PerformanceStatusIndicator: React.FC = () => {
  const { getSummary } = useWebVitals();
  const [summary, setSummary] = useState(getSummary());

  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(getSummary());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (rating: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good':
        return '🟢';
      case 'needs-improvement':
        return '🟡';
      case 'poor':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded text-xs cursor-help"
      title={`Performance: ${summary.overallRating.toUpperCase()}\nLCP: ${summary.coreWebVitals.LCP ? formatValue('LCP', summary.coreWebVitals.LCP.value) : 'N/A'}\nFID: ${summary.coreWebVitals.FID ? formatValue('FID', summary.coreWebVitals.FID.value) : 'N/A'}\nCLS: ${summary.coreWebVitals.CLS ? formatValue('CLS', summary.coreWebVitals.CLS.value) : 'N/A'}`}
    >
      <span>{getStatusIcon(summary.overallRating)}</span>
      <span className="hidden sm:inline">Performance</span>
    </div>
  );
};

// Hook for performance-aware components
export const usePerformanceOptimization = () => {
  const { getMetrics, getSummary } = useWebVitals();
  const [connectionQuality, setConnectionQuality] = useState<'slow' | 'fast' | 'unknown'>('unknown');

  useEffect(() => {
    // Check connection quality
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      const updateConnectionQuality = () => {
        const { effectiveType, downlink } = connection;
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1.5) {
          setConnectionQuality('slow');
        } else {
          setConnectionQuality('fast');
        }
      };

      updateConnectionQuality();
      connection.addEventListener('change', updateConnectionQuality);

      return () => connection.removeEventListener('change', updateConnectionQuality);
    }
  }, []);

  return {
    connectionQuality,
    shouldReduceAnimations: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    shouldOptimizeForPerformance: getSummary().overallRating !== 'good' || connectionQuality === 'slow',
    performanceRating: getSummary().overallRating,
    metrics: getMetrics()
  };
};

export default WebVitalsMonitor;