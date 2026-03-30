.PHONY: dev test build

dev:
	docker-compose up --build

test:
	pytest services/auth services/core
	npm test --prefix apps/web

clean:
	docker-compose down -v
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name "node_modules" -exec rm -rf {} +
