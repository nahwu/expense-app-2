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

## Recommended Stack (Feb 2026 Direction)

- `TypeScript`
- `Next.js` (App Router, latest stable)
- `React` (latest stable)
- `PostgreSQL` (current stable major)
- `Prisma` or `Drizzle` ORM (choose one; do not mix)
- `Auth.js` (`next-auth`) for authentication/session management
- `Tailwind CSS` + `shadcn/ui` for responsive UI
- `Recharts` for charts
- `Zod` for request validation

Version policy:
- Use `@latest` when scaffolding.
- Commit lockfiles for reproducibility.
- Upgrade on a schedule, not ad hoc.
