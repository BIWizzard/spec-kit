#!/bin/bash

# Family Finance Web Application - Test Pipeline Script
# This script orchestrates the complete testing pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
TESTS_DIR="$PROJECT_ROOT/tests"

# Environment setup
export NODE_ENV=test
export DATABASE_URL=${DATABASE_URL:-"postgresql://test_user:test_password@localhost:5432/family_finance_test"}
export JWT_SECRET=${JWT_SECRET:-"test-jwt-secret-for-testing"}
export NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-"test-nextauth-secret"}

# Parse command line arguments
RUN_BACKEND_TESTS=true
RUN_FRONTEND_TESTS=true
RUN_CONTRACT_TESTS=true
RUN_E2E_TESTS=true
RUN_COVERAGE=false
SKIP_BUILD=false
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            RUN_BACKEND_TESTS=false
            shift
            ;;
        --skip-frontend)
            RUN_FRONTEND_TESTS=false
            shift
            ;;
        --skip-contract)
            RUN_CONTRACT_TESTS=false
            shift
            ;;
        --skip-e2e)
            RUN_E2E_TESTS=false
            shift
            ;;
        --coverage)
            RUN_COVERAGE=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --skip-backend      Skip backend tests"
            echo "  --skip-frontend     Skip frontend tests"
            echo "  --skip-contract     Skip contract tests"
            echo "  --skip-e2e          Skip E2E tests"
            echo "  --coverage          Generate coverage reports"
            echo "  --skip-build        Skip build verification"
            echo "  --parallel          Run tests in parallel where possible"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Start pipeline
log "Starting Family Finance Web Application Test Pipeline"
log "Project Root: $PROJECT_ROOT"
log "Configuration:"
log "  Backend Tests: $RUN_BACKEND_TESTS"
log "  Frontend Tests: $RUN_FRONTEND_TESTS"
log "  Contract Tests: $RUN_CONTRACT_TESTS"
log "  E2E Tests: $RUN_E2E_TESTS"
log "  Coverage Reports: $RUN_COVERAGE"
log "  Skip Build: $SKIP_BUILD"
log "  Parallel Execution: $PARALLEL"

# Check prerequisites
log "Checking prerequisites..."

# Check Node.js version
NODE_VERSION=$(node --version)
log "Node.js version: $NODE_VERSION"

# Check if database is accessible (for tests that need it)
if [[ "$RUN_BACKEND_TESTS" == "true" || "$RUN_CONTRACT_TESTS" == "true" || "$RUN_E2E_TESTS" == "true" ]]; then
    log "Checking database connection..."
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        warning "Database connection failed. Some tests may fail."
        warning "Make sure PostgreSQL is running and DATABASE_URL is correct:"
        warning "  $DATABASE_URL"
    else
        success "Database connection verified"
    fi
fi

# Install dependencies
log "Installing dependencies..."
cd "$PROJECT_ROOT"
npm ci

if [[ "$RUN_BACKEND_TESTS" == "true" ]]; then
    log "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm ci

    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate

    # Run database migrations
    log "Running database migrations..."
    npx prisma migrate deploy || warning "Database migration failed"
fi

if [[ "$RUN_FRONTEND_TESTS" == "true" ]]; then
    log "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm ci
fi

# Function to run tests with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"

    log "Running $test_name..."
    cd "$test_dir"

    if eval "$test_command"; then
        success "$test_name passed"
        return 0
    else
        error "$test_name failed"
        return 1
    fi
}

# Track test results
FAILED_TESTS=()

# Run linting and type checking first
log "Running code quality checks..."

if [[ "$RUN_BACKEND_TESTS" == "true" ]]; then
    if ! run_test "Backend Linting" "npm run lint" "$BACKEND_DIR"; then
        FAILED_TESTS+=("Backend Linting")
    fi

    if ! run_test "Backend Type Check" "npm run type-check" "$BACKEND_DIR"; then
        FAILED_TESTS+=("Backend Type Check")
    fi
fi

if [[ "$RUN_FRONTEND_TESTS" == "true" ]]; then
    if ! run_test "Frontend Linting" "npm run lint" "$FRONTEND_DIR"; then
        FAILED_TESTS+=("Frontend Linting")
    fi

    if ! run_test "Frontend Type Check" "npm run type-check" "$FRONTEND_DIR"; then
        FAILED_TESTS+=("Frontend Type Check")
    fi
fi

# Run unit tests
if [[ "$RUN_BACKEND_TESTS" == "true" ]]; then
    if [[ "$RUN_COVERAGE" == "true" ]]; then
        TEST_COMMAND="npm run test:coverage"
    else
        TEST_COMMAND="npm run test:ci"
    fi

    if ! run_test "Backend Unit Tests" "$TEST_COMMAND" "$BACKEND_DIR"; then
        FAILED_TESTS+=("Backend Unit Tests")
    fi
fi

if [[ "$RUN_FRONTEND_TESTS" == "true" ]]; then
    if [[ "$RUN_COVERAGE" == "true" ]]; then
        TEST_COMMAND="npm run test:coverage"
    else
        TEST_COMMAND="npm run test:ci"
    fi

    if ! run_test "Frontend Unit Tests" "$TEST_COMMAND" "$FRONTEND_DIR"; then
        FAILED_TESTS+=("Frontend Unit Tests")
    fi
fi

# Run contract tests
if [[ "$RUN_CONTRACT_TESTS" == "true" ]]; then
    cd "$PROJECT_ROOT"
    if ! run_test "Contract Tests" "npx jest tests/contract/test_*.ts --testMatch=\"**/test_*.ts\"" "$PROJECT_ROOT"; then
        FAILED_TESTS+=("Contract Tests")
    fi
fi

# Build verification
if [[ "$SKIP_BUILD" == "false" ]]; then
    log "Running build verification..."

    if [[ "$RUN_BACKEND_TESTS" == "true" ]]; then
        if ! run_test "Backend Build" "npm run build" "$BACKEND_DIR"; then
            FAILED_TESTS+=("Backend Build")
        fi
    fi

    if [[ "$RUN_FRONTEND_TESTS" == "true" ]]; then
        if ! run_test "Frontend Build" "npm run build" "$FRONTEND_DIR"; then
            FAILED_TESTS+=("Frontend Build")
        fi
    fi
fi

# Run E2E tests
if [[ "$RUN_E2E_TESTS" == "true" ]]; then
    log "Preparing E2E test environment..."

    # Install Playwright browsers
    cd "$FRONTEND_DIR"
    npx playwright install --with-deps

    # Start services for E2E tests
    log "Starting services for E2E tests..."

    # Start backend
    cd "$BACKEND_DIR"
    npm start > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!

    # Start frontend
    cd "$FRONTEND_DIR"
    npm start > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!

    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30

    # Check if services are responding
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        success "Backend service is ready"
    else
        error "Backend service failed to start"
        FAILED_TESTS+=("E2E Test Setup - Backend")
    fi

    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend service is ready"
    else
        error "Frontend service failed to start"
        FAILED_TESTS+=("E2E Test Setup - Frontend")
    fi

    # Run E2E tests
    if ! run_test "E2E Tests" "npm run test:e2e" "$FRONTEND_DIR"; then
        FAILED_TESTS+=("E2E Tests")
    fi

    # Cleanup services
    log "Cleaning up E2E test services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
fi

# Generate coverage reports
if [[ "$RUN_COVERAGE" == "true" ]]; then
    log "Generating coverage reports..."

    # Merge coverage reports if both backend and frontend were tested
    if [[ "$RUN_BACKEND_TESTS" == "true" && "$RUN_FRONTEND_TESTS" == "true" ]]; then
        log "Merging coverage reports..."
        # This would require additional tooling like nyc or istanbul-merge
        warning "Coverage report merging not implemented yet"
    fi
fi

# Summary
log "Test Pipeline Complete"

if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
    success "All tests passed! 🎉"
    exit 0
else
    error "The following tests failed:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        error "  - $failed_test"
    done
    error "Pipeline failed ❌"
    exit 1
fi