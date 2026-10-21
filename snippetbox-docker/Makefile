COMPOSE = docker compose -f docker-compose.local.yml

.PHONY: docker/build docker/up docker/down docker/logs docker/ps

docker/build:
	$(COMPOSE) build

docker/up:
	$(COMPOSE) up -d --build

docker/down:
	$(COMPOSE) down

docker/logs:
	$(COMPOSE) logs -f snippetbox-nextjs

docker/ps:
	$(COMPOSE) ps