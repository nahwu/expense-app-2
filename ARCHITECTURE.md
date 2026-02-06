# Architecture

## Goals

- Keep deployment and maintenance simple.
- Keep all primary data under your control on Synology DS920+.
- Support secure Internet access.
- Support clean growth for reports and import/export.

## Stack Decision

Chosen direction: `TypeScript + Next.js + PostgreSQL`.

Why this over Python for this project:
- Better out-of-the-box full-stack web workflow for responsive UI.
- Strong ecosystem for charts, component libraries, and DX.
- Easy path to single-codebase deployment (UI + API).

## High-Level Design

Frontend:
- Next.js App Router pages and components.
- Tailwind CSS + shadcn/ui for responsive design system.
- Recharts for monthly/yearly/category/net worth visuals.

Backend:
- Next.js route handlers (`/api/*`) for business logic.
- Zod validation for all write endpoints.
- Authentication via Auth.js.
- Authorization enforced on every query by `user_id`.

Database:
- PostgreSQL current stable major on DS920+ (Container Manager).
- Single database with per-table `user_id` ownership.
- Optional PostgreSQL Row Level Security as a defense-in-depth layer.

## Deployment Topology (DS920+)

- One `web` container (Next.js app).
- One `db` container (PostgreSQL).
- Synology Reverse Proxy handles TLS and routes traffic to `web`.
- Database exposed only to local Docker network, not the public Internet.

## Library Policy (Latest Stable)

Use latest stable package versions at bootstrap time:

```bash
npm install next@latest react@latest react-dom@latest
npm install next-auth@latest zod@latest recharts@latest
npm install tailwindcss@latest
```

Then:
- Commit lockfile (`package-lock.json` or `pnpm-lock.yaml`).
- Track upgrades through planned release windows.

## Data Domains

- Expenses: required core records.
- Income: optional records for fuller cash-flow visibility.
- Net worth snapshots: optional monthly/yearly checkpoints.
- Categories: user-specific and system defaults.

## Reporting Domains

- Monthly and yearly spending totals.
- Spending by category and period.
- Income vs expense trend.
- Net worth trend (monthly/yearly) using snapshots.

## Non-Goals for MVP

- Multi-currency accounting engine.
- Bank API auto-sync.
- Complex budgeting envelopes.

These can be added after stable MVP launch.
