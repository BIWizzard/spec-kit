#!/bin/bash

# Quickstart Validation Runner
# Validates all core functionality from quickstart.md

set -e

echo "🚀 Starting Quickstart Validation"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from project root directory"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: Frontend directory not found"
    exit 1
fi

# Ensure dependencies are installed
echo "📦 Checking dependencies..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo "Installing Playwright..."
    npm install --save-dev @playwright/test
    npx playwright install chromium
fi

# Start development server in background
echo "🏃 Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is responding
if ! curl -f -s http://localhost:3000 > /dev/null; then
    echo "⚠️ Warning: Server may not be fully ready, but continuing with tests..."
fi

echo "✅ Development server is running"

# Run quickstart validation tests
echo "🧪 Running quickstart validation tests..."

# Create test results directory
mkdir -p ../test-results/quickstart

# Run the test
if npx playwright test ../tests/quickstart-validation/quickstart-validation.spec.ts --project=chromium --reporter=list; then
    echo "✅ Quickstart validation completed successfully!"
    VALIDATION_RESULT=0
else
    echo "⚠️ Quickstart validation found issues"
    VALIDATION_RESULT=1
fi

# Stop development server
echo "🛑 Stopping development server..."
kill $DEV_PID 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Display results
echo ""
echo "📊 Validation Results:"
echo "====================="

# Find the latest report
LATEST_REPORT=$(ls -t ../test-results/quickstart/quickstart-validation-*.md 2>/dev/null | head -n1)

if [ -f "$LATEST_REPORT" ]; then
    echo "📋 Report saved to: $LATEST_REPORT"
    echo ""
    echo "📄 Quick Summary:"
    echo "=================="

    # Extract key metrics from report
    SCORE=$(grep "Overall Score" "$LATEST_REPORT" | head -n1 | sed 's/.*: //' | sed 's/%//')
    CORE_PASSED=$(grep -c "✅.*" "$LATEST_REPORT" | head -n1)
    CORE_FAILED=$(grep -c "❌.*" "$LATEST_REPORT" | head -n1)

    echo "Overall Score: $SCORE%"
    echo "Tests Passed: $CORE_PASSED"
    echo "Tests Failed: $CORE_FAILED"

    if [ "$SCORE" -ge 90 ]; then
        echo "🎉 Excellent! Ready for production."
    elif [ "$SCORE" -ge 70 ]; then
        echo "👍 Good! Minor issues to address."
    else
        echo "⚠️ Needs work! Several issues found."
    fi

    echo ""
    echo "View full report: cat \"$LATEST_REPORT\""
else
    echo "❌ No validation report found"
fi

echo ""
echo "🏁 Quickstart validation complete!"

exit $VALIDATION_RESULT