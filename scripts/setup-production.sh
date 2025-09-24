#!/bin/bash

# Family Finance Web Application - Production Setup Script
# This script sets up the production environment on Vercel with Neon PostgreSQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/production-setup.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check for required commands
    local required_commands=("node" "npm" "git" "curl")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command '$cmd' not found. Please install it first."
            exit 1
        fi
    done

    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_version="20.0.0"
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        print_error "Node.js version $node_version is not supported. Please use version $required_version or higher."
        exit 1
    fi

    # Check if we're in the correct directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "Not in the correct project directory. Please run this script from the project root."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Function to install Vercel CLI
install_vercel_cli() {
    print_status "Installing/updating Vercel CLI..."

    if command_exists vercel; then
        print_status "Vercel CLI already installed. Updating..."
        npm update -g vercel
    else
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi

    print_success "Vercel CLI ready"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up production environment variables..."

    # Check if .env.example exists
    if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
        print_error ".env.example file not found. Please ensure it exists before running production setup."
        exit 1
    fi

    # Create production environment file template
    local prod_env_file="$PROJECT_ROOT/.env.production"
    if [ ! -f "$prod_env_file" ]; then
        print_status "Creating production environment template..."
        cp "$PROJECT_ROOT/.env.example" "$prod_env_file"

        # Update production-specific values
        sed -i.bak \
            -e 's/NODE_ENV=development/NODE_ENV=production/' \
            -e 's/APP_URL=http:\/\/localhost:3000/APP_URL=https:\/\/your-domain.vercel.app/' \
            -e 's/PLAID_ENV=sandbox/PLAID_ENV=production/' \
            -e 's/LOG_LEVEL=debug/LOG_LEVEL=info/' \
            -e 's/DEV_LOG_SQL="true"/DEV_LOG_SQL="false"/' \
            -e 's/FEATURE_MFA_REQUIRED=false/FEATURE_MFA_REQUIRED=true/' \
            -e 's/FEATURE_EMAIL_VERIFICATION=false/FEATURE_EMAIL_VERIFICATION=true/' \
            -e 's/FEATURE_RATE_LIMITING=false/FEATURE_RATE_LIMITING=true/' \
            "$prod_env_file"

        rm "${prod_env_file}.bak" 2>/dev/null || true

        print_warning "Production environment template created at $prod_env_file"
        print_warning "Please update the values with your actual production secrets before deployment."
    fi

    print_success "Environment setup completed"
}

# Function to setup Neon database
setup_neon_database() {
    print_status "Setting up Neon PostgreSQL database..."

    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not set. Please follow these steps:"
        echo ""
        echo "1. Go to https://console.neon.tech/"
        echo "2. Create a new project named 'family-finance-prod'"
        echo "3. Copy the connection string"
        echo "4. Set it as DATABASE_URL environment variable"
        echo ""
        echo "Example:"
        echo "export DATABASE_URL='postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/family_finance_prod'"
        echo ""
        print_status "Continuing without database setup. You can run migrations later."
        return 0
    fi

    print_status "Running database migrations..."
    cd "$PROJECT_ROOT/backend"

    # Generate Prisma client
    npx prisma generate

    # Run migrations
    npx prisma migrate deploy

    print_success "Database setup completed"
    cd "$PROJECT_ROOT"
}

# Function to build the application
build_application() {
    print_status "Building application for production..."

    # Install dependencies
    print_status "Installing root dependencies..."
    npm ci --production

    # Build backend
    print_status "Building backend..."
    cd "$PROJECT_ROOT/backend"
    npm ci --production
    npx prisma generate
    npm run build

    # Build frontend
    print_status "Building frontend..."
    cd "$PROJECT_ROOT/frontend"
    npm ci --production
    npm run build

    cd "$PROJECT_ROOT"
    print_success "Application build completed"
}

# Function to setup Vercel project
setup_vercel_project() {
    print_status "Setting up Vercel project..."

    # Check if already linked
    if [ -f "$PROJECT_ROOT/.vercel/project.json" ]; then
        print_status "Vercel project already linked"
    else
        print_status "Linking to Vercel project..."
        vercel link
    fi

    # Deploy to production
    print_status "Deploying to Vercel production..."
    vercel --prod

    print_success "Vercel deployment completed"
}

# Function to configure environment variables on Vercel
configure_vercel_env() {
    print_status "Configuring Vercel environment variables..."

    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "NEXTAUTH_SECRET"
        "PLAID_CLIENT_ID"
        "PLAID_SECRET"
        "RESEND_API_KEY"
    )

    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            print_status "Setting $var in Vercel..."
            echo "${!var}" | vercel env add "$var" production --stdin
        else
            print_warning "$var not set in environment. Please set it manually in Vercel dashboard."
        fi
    done

    print_success "Vercel environment variables configured"
}

# Function to run post-deployment tasks
post_deployment_tasks() {
    print_status "Running post-deployment tasks..."

    # Health check
    print_status "Performing health check..."
    local health_url="https://$(vercel ls --json | jq -r '.[0].url')/api/health"

    if curl -f "$health_url" >/dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_warning "Health check failed. Please check the deployment manually."
    fi

    # Create initial admin user (if needed)
    print_status "Production setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update your domain DNS to point to Vercel"
    echo "2. Configure SSL certificate in Vercel dashboard"
    echo "3. Set up monitoring and alerts"
    echo "4. Create your first admin user through the registration flow"
    echo ""
    print_success "Production environment is ready!"
}

# Function to generate production checklist
generate_checklist() {
    local checklist_file="$PROJECT_ROOT/production-checklist.md"
    print_status "Generating production checklist..."

    cat > "$checklist_file" << 'EOF'
# Production Deployment Checklist

## Pre-Deployment
- [ ] All tests passing in CI/CD pipeline
- [ ] Security scan completed with no high-risk issues
- [ ] Database backup strategy configured
- [ ] Environment variables set in Vercel dashboard
- [ ] SSL certificate configured
- [ ] Domain DNS configured

## Post-Deployment
- [ ] Health check endpoint responding
- [ ] Database migrations completed successfully
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring and alerting set up
- [ ] Performance monitoring enabled
- [ ] Backup verification completed

## Security Checklist
- [ ] MFA enabled for admin accounts
- [ ] Rate limiting configured
- [ ] CORS policies validated
- [ ] Security headers verified
- [ ] Input validation tested
- [ ] Authentication flows tested

## Performance Checklist
- [ ] Core Web Vitals scores acceptable
- [ ] Database queries optimized
- [ ] Caching strategies implemented
- [ ] CDN configuration verified
- [ ] Image optimization enabled

## Monitoring Setup
- [ ] Uptime monitoring configured
- [ ] Error rate alerts set up
- [ ] Performance degradation alerts
- [ ] Database connection monitoring
- [ ] Memory and CPU usage tracking

## Business Continuity
- [ ] Disaster recovery plan documented
- [ ] Backup restoration tested
- [ ] Incident response procedures defined
- [ ] Contact information updated
- [ ] Documentation updated
EOF

    print_success "Production checklist created at $checklist_file"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up temporary files..."
    # Add cleanup logic here if needed
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "=================================="
    echo "Family Finance Production Setup"
    echo "=================================="
    echo ""

    # Initialize log file
    echo "Production setup started at $(date)" > "$LOG_FILE"

    # Trap for cleanup on exit
    trap cleanup EXIT

    # Check if running with required environment variables
    if [ "$1" = "--check-only" ]; then
        print_status "Running in check-only mode..."
        check_prerequisites
        print_success "Prerequisites check completed"
        exit 0
    fi

    # Run setup steps
    check_prerequisites
    install_vercel_cli
    setup_environment
    build_application

    if [ "$1" != "--skip-deploy" ]; then
        setup_neon_database
        setup_vercel_project
        configure_vercel_env
        post_deployment_tasks
    else
        print_status "Skipping deployment steps (--skip-deploy flag)"
    fi

    generate_checklist

    print_success "Production setup completed successfully!"
    print_status "Check the log file at $LOG_FILE for detailed information"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Family Finance Production Setup Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --check-only    Only check prerequisites, don't deploy"
        echo "  --skip-deploy   Skip deployment steps, only build"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL    Neon PostgreSQL connection string (required)"
        echo "  JWT_SECRET      JWT signing secret (required)"
        echo "  NEXTAUTH_SECRET NextAuth secret (required)"
        echo "  PLAID_CLIENT_ID Plaid client ID (required)"
        echo "  PLAID_SECRET    Plaid secret key (required)"
        echo "  RESEND_API_KEY  Resend email API key (required)"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac