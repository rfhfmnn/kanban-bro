.PHONY: up down e2e test-e2e

up:
	docker compose up -d

down:
	docker compose down

e2e:
	cd e2e && npm test

test-e2e: up
	cd e2e && npm test
