# Expense App 2

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
- Local auth scaffold is Credentials-based via Auth.js (`next-auth`).

## Quick Start

1. Copy `.env.example` to `.env` and update secrets.
2. Install dependencies: `npm install`.
3. Run dev server: `npm run dev`.
4. For container deployment: `docker compose up -d --build`.

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
