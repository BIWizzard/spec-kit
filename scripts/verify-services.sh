#!/bin/bash

# ============================================================================
# KGiQ Family Finance - Service Connection Verification Script
# ============================================================================
# This script verifies all external service connections are properly configured
# Run: ./scripts/verify-services.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Loaded .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local file found. Using .env.example as reference.${NC}"
    if [ -f ".env.example" ]; then
        export $(cat .env.example | grep -v '^#' | xargs)
    fi
fi

echo ""
echo "======================================================================"
echo "            KGiQ Family Finance - Service Verification"
echo "======================================================================"
echo ""

# Track overall status
ALL_GOOD=true

# Function to check environment variable
check_env() {
    local var_name=$1
    local service_name=$2
    local required=${3:-true}

    if [ -z "${!var_name}" ] || [ "${!var_name}" == *"your-"* ] || [ "${!var_name}" == *"example"* ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}❌ $service_name: $var_name is not configured${NC}"
            ALL_GOOD=false
        else
            echo -e "${YELLOW}⚠️  $service_name: $var_name is optional and not configured${NC}"
        fi
        return 1
    else
        echo -e "${GREEN}✅ $service_name: $var_name is configured${NC}"
        return 0
    fi
}

# Function to test connection
test_connection() {
    local service=$1
    local test_command=$2

    echo -e "${BLUE}Testing $service connection...${NC}"
    if eval $test_command 2>/dev/null; then
        echo -e "${GREEN}✅ $service connection successful${NC}"
    else
        echo -e "${RED}❌ $service connection failed${NC}"
        ALL_GOOD=false
    fi
}

# ============================================================================
# 1. DATABASE CONFIGURATION
# ============================================================================
echo -e "${BLUE}1. DATABASE CONFIGURATION (Neon PostgreSQL)${NC}"
echo "----------------------------------------------------------------------"
check_env DATABASE_URL "Database"

if [ ! -z "$DATABASE_URL" ] && [ "$DATABASE_URL" != *"example"* ]; then
    # Test database connection with Prisma
    echo -e "${BLUE}Testing database connection...${NC}"
    cd backend 2>/dev/null || cd ../backend 2>/dev/null || true
    if command -v npx &> /dev/null; then
        if npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
        else
            echo -e "${RED}❌ Database connection failed - check your DATABASE_URL${NC}"
            ALL_GOOD=false
        fi
    else
        echo -e "${YELLOW}⚠️  npx not found - skipping database test${NC}"
    fi
    cd - > /dev/null 2>&1
fi
echo ""

# ============================================================================
# 2. AUTHENTICATION CONFIGURATION
# ============================================================================
echo -e "${BLUE}2. AUTHENTICATION CONFIGURATION${NC}"
echo "----------------------------------------------------------------------"

# Check for Supabase
if check_env NEXT_PUBLIC_SUPABASE_URL "Supabase Auth" false; then
    check_env NEXT_PUBLIC_SUPABASE_ANON_KEY "Supabase Auth"
    check_env SUPABASE_SERVICE_ROLE_KEY "Supabase Auth"
    echo -e "${GREEN}✅ Using Supabase Authentication${NC}"
# Check for NextAuth
elif check_env NEXTAUTH_SECRET "NextAuth" false; then
    check_env NEXTAUTH_URL "NextAuth"
    echo -e "${GREEN}✅ Using NextAuth Authentication${NC}"

    # Check OAuth providers
    if check_env GOOGLE_CLIENT_ID "Google OAuth" false; then
        check_env GOOGLE_CLIENT_SECRET "Google OAuth"
    fi
    if check_env GITHUB_CLIENT_ID "GitHub OAuth" false; then
        check_env GITHUB_CLIENT_SECRET "GitHub OAuth"
    fi
else
    echo -e "${RED}❌ No authentication provider configured${NC}"
    echo -e "${YELLOW}   Configure either Supabase or NextAuth in .env.local${NC}"
    ALL_GOOD=false
fi
echo ""

# ============================================================================
# 3. PLAID BANK INTEGRATION
# ============================================================================
echo -e "${BLUE}3. PLAID BANK INTEGRATION${NC}"
echo "----------------------------------------------------------------------"
check_env PLAID_CLIENT_ID "Plaid"
check_env PLAID_SECRET "Plaid"
check_env PLAID_ENV "Plaid"

if [ "$PLAID_ENV" = "sandbox" ]; then
    echo -e "${GREEN}✅ Plaid configured for sandbox (development) mode${NC}"
elif [ "$PLAID_ENV" = "development" ]; then
    echo -e "${YELLOW}⚠️  Plaid in development mode - real bank connections possible${NC}"
elif [ "$PLAID_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Plaid in PRODUCTION mode - real money involved!${NC}"
fi
echo ""

# ============================================================================
# 4. EMAIL SERVICE
# ============================================================================
echo -e "${BLUE}4. EMAIL SERVICE (Resend)${NC}"
echo "----------------------------------------------------------------------"
check_env RESEND_API_KEY "Email"
check_env RESEND_FROM_EMAIL "Email" false
check_env RESEND_FROM_NAME "Email" false

# Alternative SMTP configuration
if [ -z "$RESEND_API_KEY" ] || [ "$RESEND_API_KEY" == *"your-"* ]; then
    echo -e "${YELLOW}Checking alternative SMTP configuration...${NC}"
    if check_env SMTP_HOST "SMTP" false; then
        check_env SMTP_PORT "SMTP"
        check_env SMTP_USER "SMTP"
        check_env SMTP_PASS "SMTP"
        echo -e "${GREEN}✅ Using SMTP for email${NC}"
    fi
fi
echo ""

# ============================================================================
# 5. DEPLOYMENT & HOSTING
# ============================================================================
echo -e "${BLUE}5. DEPLOYMENT & HOSTING${NC}"
echo "----------------------------------------------------------------------"

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✅ Vercel CLI installed${NC}"

    # Check if linked to a Vercel project
    if [ -f ".vercel/project.json" ]; then
        echo -e "${GREEN}✅ Project linked to Vercel${NC}"
        PROJECT_NAME=$(cat .vercel/project.json | grep -o '"name":"[^"]*' | cut -d'"' -f4)
        echo -e "${BLUE}   Project: $PROJECT_NAME${NC}"
    else
        echo -e "${YELLOW}⚠️  Project not linked to Vercel yet${NC}"
        echo -e "${YELLOW}   Run: vercel link${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo -e "${YELLOW}   Run: npm i -g vercel${NC}"
fi

check_env VERCEL_URL "Vercel" false
check_env VERCEL_ENV "Vercel" false
echo ""

# ============================================================================
# 6. MONITORING & ERROR TRACKING
# ============================================================================
echo -e "${BLUE}6. MONITORING & ERROR TRACKING (Optional)${NC}"
echo "----------------------------------------------------------------------"
check_env NEXT_PUBLIC_SENTRY_DSN "Sentry" false
check_env SENTRY_AUTH_TOKEN "Sentry" false
echo ""

# ============================================================================
# 7. FILE SYSTEM CHECK
# ============================================================================
echo -e "${BLUE}7. PROJECT STRUCTURE VERIFICATION${NC}"
echo "----------------------------------------------------------------------"

# Check for required directories
DIRS=("backend/src" "frontend/src" "backend/prisma" "tests")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Directory exists: $dir${NC}"
    else
        echo -e "${RED}❌ Missing directory: $dir${NC}"
        ALL_GOOD=false
    fi
done

# Check for Prisma schema
if [ -f "backend/prisma/schema.prisma" ]; then
    echo -e "${GREEN}✅ Prisma schema found${NC}"
else
    echo -e "${RED}❌ Prisma schema not found${NC}"
    ALL_GOOD=false
fi
echo ""

# ============================================================================
# 8. DEPENDENCY CHECK
# ============================================================================
echo -e "${BLUE}8. DEPENDENCY CHECK${NC}"
echo "----------------------------------------------------------------------"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"

    # Check if it's version 20 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 20 ]; then
        echo -e "${GREEN}✅ Node.js version is 20 or higher${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js version is below 20 (found: $NODE_VERSION)${NC}"
        echo -e "${YELLOW}   Recommended: Node.js 20 LTS or higher${NC}"
    fi
else
    echo -e "${RED}❌ Node.js not installed${NC}"
    ALL_GOOD=false
fi

# Check npm/yarn
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"
elif command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✅ yarn installed: $YARN_VERSION${NC}"
else
    echo -e "${RED}❌ No package manager (npm/yarn) found${NC}"
    ALL_GOOD=false
fi
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "======================================================================"
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}🎉 ALL SERVICES CONFIGURED SUCCESSFULLY!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations: cd backend && npx prisma migrate dev"
    echo "2. Start development server: npm run dev"
    echo "3. Deploy to staging: vercel"
    echo "4. Test with Plaid sandbox credentials:"
    echo "   - Username: user_good"
    echo "   - Password: pass_good"
else
    echo -e "${YELLOW}⚠️  SOME SERVICES NEED CONFIGURATION${NC}"
    echo ""
    echo "Action items:"
    echo "1. Copy .env.example to .env.local if not done"
    echo "2. Fill in missing service credentials in .env.local"
    echo "3. Follow the setup guide in docs/SERVICE_SETUP_GUIDE.md"
    echo "4. Run this script again to verify"
fi
echo "======================================================================"
echo ""

# Exit with appropriate code
if [ "$ALL_GOOD" = true ]; then
    exit 0
else
    exit 1
fi