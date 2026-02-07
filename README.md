# ClearWorth

Self-hosted personal finance app for tracking expenses, optional income, and optional net worth snapshots.

## Current Status

Implemented:
- Expense CRUD with filters and categories (system + custom).
- Income CRUD.
- Net worth snapshot CRUD.
- Reporting: spending by category, cashflow, net worth trend, year-over-year spend.
- CSV export for expenses, incomes, and net worth snapshots.
- Responsive dashboard with collapsible desktop sidebar, mobile nav, and quick-add expense button.

Not implemented yet:
- CSV import processing (endpoint scaffold exists and currently returns `501`).
- MFA, audit logging, backup automation/restore validation, CI hardening tasks from roadmap.

## Product Scope

- CRUD expenses with `amount`, `category`, `date`, optional `payee`, and `notes`.
- Optional income tracking with optional `source`.
- Optional monthly/yearly net worth snapshots.
- Internet-accessible with per-user data isolation.

## Documentation

- `ARCHITECTURE.md`: stack decisions and deployment model.
- `DB_SCHEMA.md`: PostgreSQL schema and indexing.
- `API.md`: API contract for CRUD, reports, import/export.
- `SECURITY.md`: security baseline for Internet exposure.
- `ROADMAP.md`: delivery phases and completion status.
- `DEPLOYMENT_SYNOLOGY_DS920.md`: DS920+ deployment notes.
- `VERSIONS.md`: pinned dependency versions.

## Repository Layout

- App code: `src/`
- API routes: `src/app/api/`
- DB bootstrap SQL: `db/init/001_schema.sql`
- Tests: `tests/`

## Environment Variables

Copy `.env.example` to `.env` for local development.

Required for app/runtime:
- `NODE_ENV`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Required by local Docker DB setup:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DB_DATA_PATH`

Optional:
- `NEXTAUTH_URL_INTERNAL` (useful in reverse-proxy/containerized setups)
- `PORT`

## Local Development

### Prerequisites

- Node.js `24.x` (recommended).
- Docker Desktop (or compatible local Docker engine).

### 1. Create local environment file

```powershell
Copy-Item .env.example .env
```

### 2. Start PostgreSQL

```powershell
docker compose up -d db
```

Notes:
- Schema in `db/init/001_schema.sql` is auto-applied on first DB initialization.
- App connects through `localhost:5432` in local development.

### 3. Install dependencies and run app

```powershell
npm install
npm run dev
```

App URLs:
- App: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`
- Sign up: `http://localhost:3000/signup`

### 4. Run tests/checks

```powershell
npm run test
npm run typecheck
```

### 5. Stop local services

```powershell
docker compose stop db
```

## Deployment Notes

- Local compose file: `docker-compose.yml`
- Synology/DSM-oriented compose file: `docker-compose.synology.yml`
- Detailed Synology guide: `DEPLOYMENT_SYNOLOGY_DS920.md`

## Scripts

- `npm run dev`: start Next.js dev server.
- `npm run build`: production build.
- `npm run start`: run production server on port `3000`.
- `npm run test`: run Vitest suite.
- `npm run typecheck`: run TypeScript checks.
