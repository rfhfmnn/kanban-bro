.PHONY: up down e2e test-e2e test-backend test-frontend test-integration

up:
	docker compose up -d

down:
	docker compose down

e2e:
	cd e2e && npm test

test-e2e: up
	cd e2e && npm test

test-backend:
	cd backend && uv run pytest tests/ -v

test-frontend:
	cd frontend && npm test

test-integration: up
	cd backend && uv run pytest tests/test_compose_integration.py tests/test_postgres_live.py tests/test_two_session_live.py -v

