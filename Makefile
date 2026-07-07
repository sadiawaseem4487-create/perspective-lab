.PHONY: dev build docker-up docker-down docker-logs install test test-health

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

build:
	cd frontend && npm run build

dev:
	cd backend && . .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

docker-up:
	cp -n .env.example .env || true
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f app

test:
	cd backend && . .venv/bin/activate && pip install -q -r requirements-dev.txt && pytest tests/ -v

test-health:
	curl -fsS http://127.0.0.1:8000/api/health | python3 -m json.tool
