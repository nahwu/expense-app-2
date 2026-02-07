# ClearWorth

Self-hosted personal finance app for tracking expenses, optional income, and optional net worth snapshots.

## Product Scope

- CRUD expenses with `amount`, `category`, `date`, `payee`, `notes`.
- Optional income tracking.
- Optional monthly/yearly net worth snapshots.
- Responsive web UI for phone, tablet, and desktop.
- Internet-accessible with strong per-user data isolation.
- Future import/export support.

## Documentation

- `ARCHITECTURE.md`: stack decisions and deployment model.
- `DB_SCHEMA.md`: PostgreSQL schema and indexing.
- `API.md`: API contract for CRUD, reports, and future import/export.
- `SECURITY.md`: security baseline for Internet exposure.
- `ROADMAP.md`: MVP and post-MVP plan.
- `DEPLOYMENT_SYNOLOGY_DS920.md`: DS920+ deployment notes.
- `VERSIONS.md`: pinned dependency versions.

## Scaffolded App

- Next.js app files are under `src/`.
- API routes are under `src/app/api/`.
- Initial DB bootstrap SQL is under `db/init/001_schema.sql`.
- Auth is Credentials-based via Auth.js (`next-auth`) and `app_users` table.

## Quick Start

1. Copy `.env.example` to `.env` and update secrets.
2. Start local database: `docker compose up -d db`.
3. Install dependencies: `npm install`.
4. Run dev server on host: `npm run dev`.
5. For DS920+ deployment, use `DEPLOYMENT_SYNOLOGY_DS920.md`.
   - DSM Project UI deployment uses `docker-compose.synology.yml`.

## Run Locally (Development)

This project uses a simple local workflow:
- Run only PostgreSQL in Docker.
- Run Next.js on your host machine with `npm run dev`.

### Prerequisites

- Node.js `24.x` (recommended) or `22.x` (currently works with warnings).
- Docker Desktop (or compatible local Docker engine).

### 1. Create local environment file

PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` for local development:
- `NODE_ENV=development`
- `NEXTAUTH_URL=http://localhost:3000`
- `POSTGRES_PASSWORD` and `DATABASE_URL` must match.
- `DATABASE_URL` host must be `localhost` when running `npm run dev` on your host.
- `DB_DATA_PATH=./.docker/postgres` (recommended for local).
- Set a real `NEXTAUTH_SECRET`.

### 2. Start only PostgreSQL locally

```powershell
docker compose up -d db
```

Notes:
- Initial schema is auto-applied from `db/init/001_schema.sql` on first DB initialization.
- If you already had an old DB volume, reset it manually before re-initializing.
- If `db` keeps restarting with PostgreSQL 18 storage-layout errors, move `DB_DATA_PATH` to a new empty folder (for example `./.docker/postgres2`) and start again.
- Local host app connects to Docker DB through `localhost:5432` (published by compose).

### 3. Install dependencies and run the app

```powershell
npm install
npm run dev
```

App URLs:
- App: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`
- Sign up: `http://localhost:3000/signup`

### 4. Run tests

```powershell
npm run test
npm run typecheck
```

### 5. Stop local services

```powershell
docker compose stop db
```

## Recommended Stack (Feb 2026 Direction)

- `TypeScript`
- `Next.js 16.1.6` (App Router)
- `React 19.2.0`
- `PostgreSQL 18.0`
- `pg 8.16.3` (direct SQL, no ORM in MVP scaffold)
- `Auth.js` (`next-auth 4.24.13`) for authentication/session management
- `Tailwind CSS 4.1.13` + `shadcn/ui` for responsive UI
- `Recharts 3.1.2` for charts
- `Zod 4.1.12` for request validation

Version policy:
- Pin concrete versions in `package.json`.
- Commit lockfiles for reproducibility.
- Upgrade on a schedule, not ad hoc, with explicit tests.

Pinned versions in this repo were retrieved on February 6, 2026.
