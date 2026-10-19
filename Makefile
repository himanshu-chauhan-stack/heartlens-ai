.PHONY: install test train train-quick serve web lint docker-build
install:
	cd backend && python -m pip install -e ".[dev,viz]"
	cd apps/web && npm ci
train:
	cd backend && python scripts/train.py --config config/config.yaml
train-quick:
	cd backend && python scripts/train.py --config config/config.quick.yaml
serve:
	cd backend && python -m uvicorn src.api.app:app --host 127.0.0.1 --port 8000
web:
	cd apps/web && npm run dev
test:
	cd backend && python -m pytest tests/ -q
	cd apps/web && npm test
lint:
	cd backend && python -m black --check src/ tests/
	cd backend && python -m flake8 src/ tests/ --count --select=E9,F63,F7,F82 --show-source --statistics
	cd apps/web && npm run lint
docker-build:
	docker compose build
