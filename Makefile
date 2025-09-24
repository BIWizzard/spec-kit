# Family Finance Web Application - Development Commands
.PHONY: help build up down restart logs clean seed test db-migrate db-reset

# Default help command
help: ## Show this help message
	@echo "Family Finance Web Application - Development Commands"
	@echo "======================================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker commands
build: ## Build all Docker containers
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose down && docker-compose up -d

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

# Development commands
dev: ## Start development environment with live reload
	docker-compose up --build

clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all
	docker system prune -f

clean-volumes: ## Remove only volumes (keeps images)
	docker-compose down -v

# Database commands
db-migrate: ## Run database migrations
	docker-compose exec backend npx prisma migrate deploy

db-seed: ## Seed database with sample data
	docker-compose exec backend npx prisma db seed

db-reset: ## Reset database and reseed
	docker-compose exec backend npx prisma migrate reset --force
	docker-compose exec backend npx prisma db seed

db-studio: ## Open Prisma Studio
	docker-compose exec backend npx prisma studio

# Testing commands
test: ## Run all tests
	docker-compose exec backend npm test

test-watch: ## Run tests in watch mode
	docker-compose exec backend npm run test:watch

test-coverage: ## Run tests with coverage
	docker-compose exec backend npm run test:coverage

# Linting and formatting
lint: ## Run linting
	docker-compose exec backend npm run lint
	docker-compose exec frontend npm run lint

format: ## Format code
	docker-compose exec backend npm run format
	docker-compose exec frontend npm run format

# Health checks
status: ## Check service status
	docker-compose ps

health: ## Check service health
	@echo "Checking service health..."
	@curl -f http://localhost/health && echo " ✓ API Health Check Passed" || echo " ✗ API Health Check Failed"
	@curl -f http://localhost:3000 && echo " ✓ Frontend Health Check Passed" || echo " ✗ Frontend Health Check Failed"

# Backup and restore
backup: ## Backup database
	docker-compose exec postgres pg_dump -U family_finance_user -d family_finance_dev > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore: ## Restore database from backup (usage: make restore FILE=backup_file.sql)
	docker-compose exec -T postgres psql -U family_finance_user -d family_finance_dev < $(FILE)

# Environment setup
setup: ## Initial setup for development
	@echo "Setting up Family Finance development environment..."
	cp .env.example .env.local || true
	docker-compose build
	docker-compose up -d postgres redis
	@echo "Waiting for database to be ready..."
	sleep 10
	docker-compose up --build -d
	@echo "Running migrations and seeding..."
	make db-migrate
	make db-seed
	@echo "Setup complete! Visit http://localhost for the application."
	@echo "Development tools:"
	@echo "- Adminer (DB): http://localhost:8080"
	@echo "- Redis Commander: http://localhost:8081"
	@echo "- Mailhog: http://localhost:8025"

# Production-like testing
prod-build: ## Build production-like containers
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-up: ## Start production-like environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitoring
monitor: ## Show resource usage
	docker stats

# Shell access
shell-backend: ## Access backend container shell
	docker-compose exec backend sh

shell-frontend: ## Access frontend container shell
	docker-compose exec frontend sh

shell-db: ## Access database shell
	docker-compose exec postgres psql -U family_finance_user -d family_finance_dev

# Network debugging
network: ## Show Docker network information
	docker network ls
	docker-compose exec backend ping postgres -c 3
	docker-compose exec frontend ping backend -c 3