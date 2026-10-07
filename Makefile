.DEFAULT_GOAL := all

.PHONY: all setup deps dev dev-backend dev-frontend dev-mac build build-backend build-frontend build-mac clean clean-backend clean-frontend clean-mac help \
        up up-d up-build down restart open \
        logs logs-backend logs-frontend ps \
        db-migrate db-rollback db-reset db-fake db-seed db-status \
        console routes shell-backend shell-frontend \
        typecheck test test-backend test-frontend test-fast lint-backend nuke hooks

# GUI-launched processes on macOS (Dock, Spotlight, a task runner — anything
# that isn't a shell that sourced your profile) get a minimal PATH from
# launchd that excludes /usr/local/bin and /opt/homebrew/bin, which is where
# Docker Desktop, Homebrew's docker CLI, and colima all put their binaries.
# `make dev` failing with "docker: command not found" in that context, while
# working fine from a normal terminal, is that — not a broken install.
export PATH := /opt/homebrew/bin:/usr/local/bin:$(PATH)

# Rewrite localhost proxy URLs to host.docker.internal so containers can reach them
HOST_PROXY = $(shell echo "$${HTTP_PROXY:-}" | sed 's/localhost/host.docker.internal/g')
COMPOSE     = HTTP_PROXY=$(HOST_PROXY) HTTPS_PROXY=$(HOST_PROXY) docker compose

# ── Main ──────────────────────────────────────────────────────────────────────

all: setup dev build-mac ## Setup environment, start development, and build the macOS app (default)

deps: ## Install/verify host dependencies: Homebrew, Docker (via colima if missing), Node
	bash scripts/bootstrap-deps.sh

setup: deps ## Install host dependencies (Homebrew, Docker, Node), then build images, start services, prepare the database, install local deps, and install git hooks
	$(COMPOSE) build
	$(COMPOSE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	$(COMPOSE) exec backend bundle exec rails db:prepare
	$(COMPOSE) exec backend bundle exec rails db:seed
	cd frontend && npm install
	$(MAKE) hooks
	@echo "✓ Setup complete"

dev: ## Rebuild all services, start detached, and open browser
	$(COMPOSE) down --remove-orphans
	$(COMPOSE) build
	$(COMPOSE) up -d
	@sleep 3
	open http://localhost:5174

dev-backend: ## Rebuild and restart the backend service only
	$(COMPOSE) build backend
	$(COMPOSE) up -d backend

dev-frontend: ## Rebuild and restart the frontend service only
	$(COMPOSE) build frontend
	$(COMPOSE) up -d frontend

dev-mac: ## Start services, stream logs, and open the Electron app
	$(COMPOSE) up -d
	@echo "Waiting for frontend dev server..."
	@until $$(curl -sf http://localhost:5174 > /dev/null); do sleep 1; done
	$(COMPOSE) logs -f &
	cd frontend && ELECTRON_DEV_SERVER_URL=http://localhost:5174 npx electron .
	@kill $$(jobs -p) 2>/dev/null || true

build: ## Build all (backend Docker image + macOS Electron app)
	$(COMPOSE) build backend
	cd frontend && npm install && npm run electron:build-mac

build-backend: ## Build the backend production Docker image
	$(COMPOSE) build backend

build-frontend: ## Build the frontend for production (webpack bundle)
	$(COMPOSE) run --rm frontend npm run build

build-mac: ## Build the macOS Electron app (outputs to frontend/dist-electron)
	cd frontend && npm install && npm run electron:build-mac

clean: ## Remove containers, volumes, all build artifacts, and Docker build cache
	$(COMPOSE) down -v --remove-orphans
	rm -rf frontend/dist frontend/dist-electron
	docker builder prune -f

clean-backend: ## Remove the backend container and its volume
	$(COMPOSE) rm -sf backend
	docker volume rm $$(docker volume ls -q | grep backend_bundle) 2>/dev/null || true

clean-frontend: ## Remove the frontend container, node_modules volume, and webpack build output
	$(COMPOSE) rm -sf frontend
	docker volume rm $$(docker volume ls -q | grep frontend_node_modules) 2>/dev/null || true
	rm -rf frontend/dist

clean-mac: ## Remove the Electron build output
	rm -rf frontend/dist frontend/dist-electron

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/{printf "  \033[36m%-18s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

# ── Run ───────────────────────────────────────────────────────────────────────

up: ## Start all services (foreground, streaming logs)
	$(COMPOSE) up

up-d: ## Start all services in the background
	$(COMPOSE) up -d

up-build: ## Rebuild images then start all services
	$(COMPOSE) up --build

down: ## Stop and remove containers
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

open: ## Open the app in the default browser
	open http://localhost:5174

# ── Logs ──────────────────────────────────────────────────────────────────────

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

logs-backend: ## Tail backend logs
	$(COMPOSE) logs -f backend

logs-frontend: ## Tail frontend logs
	$(COMPOSE) logs -f frontend

ps: ## Show running service status
	$(COMPOSE) ps

# ── Database ──────────────────────────────────────────────────────────────────

db-migrate: ## Run pending migrations
	$(COMPOSE) exec backend bundle exec rails db:migrate

db-rollback: ## Roll back the last migration
	$(COMPOSE) exec backend bundle exec rails db:rollback

db-reset: ## Wipe the database and stage it with random test data (drop, recreate, migrate, seed)
	$(COMPOSE) exec backend bundle exec rails db:drop db:create db:migrate db:seed

db-fake: db-reset ## Alias for db-reset

db-seed: ## Run database seeds
	$(COMPOSE) exec backend bundle exec rails db:seed

db-status: ## Show migration status
	$(COMPOSE) exec backend bundle exec rails db:migrate:status

# ── Rails ─────────────────────────────────────────────────────────────────────

console: ## Open a Rails console
	$(COMPOSE) exec backend bundle exec rails console

routes: ## Print all API routes
	$(COMPOSE) exec backend bundle exec rails routes

shell-backend: ## Open a shell in the backend container
	$(COMPOSE) exec backend bash

# ── Frontend ──────────────────────────────────────────────────────────────────

shell-frontend: ## Open a shell in the frontend container
	$(COMPOSE) exec frontend sh

typecheck: ## Run TypeScript type-checker
	$(COMPOSE) exec frontend sh -c "cd /app && ./node_modules/.bin/tsc --noEmit"

# ── Quality ───────────────────────────────────────────────────────────────────

test: test-backend test-frontend ## Run the full test suite (backend + frontend)

test-backend: ## Run the full backend test suite
	$(COMPOSE) exec backend bundle exec rails test

# Runs inside the frontend container, not on the host: the frontend
# container's node_modules is a separate named volume from the host's (see
# docker-compose.yml), and the host Node version isn't pinned to what Jest
# needs, so `npm install` here keeps the container's copy in sync with
# package.json before testing against it.
test-frontend: ## Run the frontend test suite
	$(COMPOSE) up -d frontend
	$(COMPOSE) exec -T frontend npm install
	$(COMPOSE) exec -T frontend npm test -- --silent

test-fast: ## Run the short suite used by the pre-commit hook (models/controllers + frontend unit tests only)
	$(COMPOSE) up -d backend frontend
	$(COMPOSE) exec -T backend bundle exec rails test test/models test/controllers
	$(COMPOSE) exec -T frontend npm install
	$(COMPOSE) exec -T frontend npm test -- --silent

lint-backend: ## Lint Ruby code with RuboCop
	$(COMPOSE) exec backend bundle exec rubocop --parallel || true

# ── Git hooks ─────────────────────────────────────────────────────────────────

hooks: ## Install the git pre-commit hook (runs `test-fast` before every commit)
	@cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "✓ Installed pre-commit hook"

# ── Cleanup ───────────────────────────────────────────────────────────────────

nuke: ## Remove everything including built images (full reset)
	$(COMPOSE) down -v --remove-orphans --rmi all

.PHONY: build-native-mac dev-native-mac test-native-mac
build-native-mac: ## Build the gradual SwiftUI macOS app alongside Electron
	bash scripts/build-native-mac.sh

dev-native-mac: build-native-mac ## Open the native SwiftUI macOS app
	open macos/dist/Inertia.app

test-native-mac: ## Run native API/model regression tests
	swift test --package-path macos
