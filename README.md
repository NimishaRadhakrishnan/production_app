# Vishakan Biotech — Field Force Operations & Administration Platform

A role-based enterprise web app for managing Vishakan Biotech's field
operations: GPS attendance and live location tracking, weekly plan
submission/approval, farmer and dealer registries with photo-based crop
disease reporting, task assignment, productivity rollups, leave/HR-policy
and day-closure workflows, and PDF/Excel reporting — for Admins, Regional
Managers, Sales Officers, Field Officers, Dealers, and Farmers.

A companion React Native mobile app (`mobile/`) covers the same core
field-officer flows (attendance, visits, weekly plans, farmer/dealer
lookup, crop issue reporting). Its auth is real — it calls the actual
`/auth/login` and `/auth/me` endpoints, not a mock token. Two things are
still simulated: the offline queue (`services/db.ts` is an in-memory
stand-in for on-device SQLite, so it doesn't survive an app restart) and
`BACKEND_URL`, which is hardcoded to `localhost:8000` rather than
configurable per environment.

## Quickstart

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env: set JWT_SECRET_KEY (openssl rand -hex 32) and POSTGRES_PASSWORD

cp frontend/.env.example frontend/.env.local

# 2. Start everything
docker compose up --build

# 3. Run database migrations (first time, or after pulling new migrations)
docker compose exec backend alembic upgrade head
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs
- Via Nginx (proxies both): http://localhost

## Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Running tests

```bash
cd backend
pytest -v                 # unit tests always run; integration tests
                           # auto-skip if Postgres isn't reachable

cd frontend
npm run type-check && npm run lint && npm run build
```

## Project structure

```
backend/    FastAPI service — Clean Architecture (domain/application/infrastructure/presentation)
frontend/   Next.js + TypeScript + Tailwind — single role-aware dashboard (login, register, dashboard)
mobile/     React Native prototype for field officers (attendance, visits, plans, farmers, dealers, crop issues)
infra/      Nginx reverse proxy config
docker-compose.yml   Full local orchestration (Postgres + PostGIS, Redis, backend, frontend, Nginx)
.github/workflows/   CI pipeline (backend lint/type-check/test, frontend type-check/lint/build)
docs/       Architecture and roadmap documentation
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layering rationale
and current module inventory, and [docs/ROADMAP.md](docs/ROADMAP.md) for
what's shipped and what's still open.

## Note on inherited scaffolding (resolved)

This backend was originally bootstrapped from a different project (an
"MCP Server Risk Scanner" governance tool). That scaffold has since been
removed — no `alert_router`/`audit_router`/`capability_router`/etc. and
no matching domain entities, DB models, or use cases remain in the tree.
The cosmetic leftovers are also gone: the FastAPI title, `frontend/package.json`'s
`name`, and the Postgres user/DB name all reflect this project
(`Vishakan Field Force Platform`, `vishakan-ffm-frontend`,
`vishakan_ffm`), not the old one. Nothing further to do here.