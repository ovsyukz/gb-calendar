# gb-calendar — run `make` on its own to see everything available.
#
# There is no build step: the browser loads the ES modules in public/
# directly. `make start` is all you need day to day.

.DEFAULT_GOAL := help
.PHONY: help setup install migrate start dev test watch lint format check clean reset-db

help: ## Show this help
	@echo ''
	@echo '  gb-calendar'
	@echo ''
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'
	@echo ''

setup: install migrate ## First-time setup: dependencies, .env, database
	@echo ''
	@echo '  Ready. Run "make start" and open http://localhost:8888'
	@echo ''

install: ## Install dependencies and create .env if missing
	npm install
	@test -f .env || (cp .env.example .env && echo 'created .env from .env.example')

migrate: ## Create or update the database tables
	npm run migrate

start: ## Run the app at http://localhost:8888
	npm run dev

dev: start ## Alias for start

test: ## Run the test suite
	npm test

watch: ## Run tests continuously while you edit
	npm run test:watch

lint: ## Check for code problems
	npm run lint

format: ## Reformat all files
	npm run format

check: lint test ## Everything CI runs: lint, formatting, tests
	npm run format:check

clean: ## Remove dependencies and the local database
	rm -rf node_modules .pgdata

reset-db: ## Throw away local sign-ups and start with empty tables
	rm -rf .pgdata
	npm run migrate
