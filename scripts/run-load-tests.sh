#!/bin/bash

# Load Testing Script for Family Finance Web Application
# Task: T446 - Load testing for concurrent users (100+ simultaneous)
#
# This script runs comprehensive load tests to validate system performance
# under concurrent user load.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3001"}
TEST_ENV=${TEST_ENV:-"development"}
PARALLEL_WORKERS=${PARALLEL_WORKERS:-4}

echo -e "${BLUE}🚀 Starting Load Tests for Family Finance Web Application${NC}"
echo -e "${BLUE}=================================================${NC}"
echo "API Base URL: $API_BASE_URL"
echo "Test Environment: $TEST_ENV"
echo "Parallel Workers: $PARALLEL_WORKERS"
echo ""

# Check if the API server is running
echo -e "${YELLOW}📡 Checking API server availability...${NC}"
if curl -s "$API_BASE_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✅ API server is running${NC}"
else
    echo -e "${RED}❌ API server is not responding at $API_BASE_URL${NC}"
    echo -e "${YELLOW}💡 Please start the backend server before running load tests${NC}"
    exit 1
fi

# Set up test database if needed
if [ "$TEST_ENV" = "test" ]; then
    echo -e "${YELLOW}🗄️  Setting up test database...${NC}"
    cd backend && npm run db:reset && cd ..
fi

# Function to run a specific load test
run_load_test() {
    local test_name="$1"
    local test_pattern="$2"
    local timeout="$3"

    echo -e "${YELLOW}🔄 Running $test_name...${NC}"

    if timeout "$timeout" npx jest "tests/load/test_concurrent_users.ts" --testNamePattern="$test_pattern" --verbose --detectOpenHandles --forceExit; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed or timed out${NC}"
        return 1
    fi
}

# Create load test results directory
mkdir -p results/load-tests
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="results/load-tests/load_test_results_$TIMESTAMP.log"

echo -e "${BLUE}📊 Load test results will be saved to: $RESULTS_FILE${NC}"

# Redirect all output to both console and log file
exec 1> >(tee -a "$RESULTS_FILE")
exec 2> >(tee -a "$RESULTS_FILE" >&2)

echo "Load Test Run Started: $(date)"
echo "API Base URL: $API_BASE_URL"
echo "Test Environment: $TEST_ENV"
echo "=============================================="

# Test execution plan
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}🎯 Phase 1: Basic Load Testing${NC}"

if run_load_test "10 Concurrent Users" "should handle 10 concurrent users" "60s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_load_test "25 Concurrent Users" "should handle 25 concurrent users" "90s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_load_test "50 Concurrent Users" "should handle 50 concurrent users" "120s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "${BLUE}🎯 Phase 2: High Load Testing${NC}"

if run_load_test "100 Concurrent Users" "should handle 100 concurrent users" "180s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_load_test "150 Concurrent Users" "should handle 150 concurrent users" "240s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "${BLUE}🎯 Phase 3: Write Operation Load Testing${NC}"

if run_load_test "Concurrent Write Operations - Income" "should handle 20 concurrent users creating income" "120s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

if run_load_test "Concurrent Write Operations - Payments" "should handle 30 concurrent users creating payments" "150s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "${BLUE}🎯 Phase 4: Mixed Workload Testing${NC}"

if run_load_test "Mixed Workload Test" "should handle mixed read/write operations" "420s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "${BLUE}🎯 Phase 5: Stress Testing${NC}"

if run_load_test "Stress Test - 200 Users" "should gracefully degrade under extreme load" "300s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo -e "${BLUE}🎯 Phase 6: Endurance Testing${NC}"

if run_load_test "Endurance Test" "should maintain performance over sustained load" "420s"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "=============================================="
echo "Load Test Run Completed: $(date)"
echo "=============================================="
echo -e "${BLUE}📈 LOAD TEST SUMMARY${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

PASS_RATE=$((TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED)))
echo -e "Pass Rate: ${GREEN}$PASS_RATE%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All load tests passed!${NC}"
    echo -e "${GREEN}✅ System meets concurrent user performance requirements${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some load tests failed${NC}"
    echo -e "${YELLOW}💡 Check the detailed results above for performance bottlenecks${NC}"
    exit 1
fi