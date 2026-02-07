# Roadmap

Status legend: `[x]` completed, `[ ]` not completed.

## Phase 0: Foundation

- [x] Finalize docs and schema.
- [x] Scaffold Next.js TypeScript app.
- [x] Set up PostgreSQL container on DS920+.
- [x] Wire auth, session handling, and protected routes.

## Phase 1: MVP

- [x] User can sign up, sign in, and sign out securely.
- [x] Expense categories (system + custom).
- [x] Expense CRUD with validation.
- [x] Expense list filters (date range/category/payee).
- [x] Dashboard cards for monthly/yearly totals.
- [x] Responsive layout for phone and desktop.

## Phase 2: Optional Income + Net Worth

- [x] Income CRUD.
- [x] Net worth snapshot CRUD.
- [x] Cashflow chart (income vs expenses).
- [x] Net worth trend chart (monthly/yearly).

## Phase 3: Reporting

- [x] Spending by category chart.
- [x] Year-over-year spend comparison.
- [x] Data tables with export buttons.

## Phase 4: Import/Export

- [x] CSV export for expenses, incomes, and net worth snapshots.
- [ ] CSV import with validation report and partial-failure handling.
- [ ] On desktop/mobile, allow user to copy & paste text for import. Input format to be defined.
- [ ] Duplicate-detection strategy for import.
- [ ] UI to display results of import. Allow user to manually fix simple issues. And to re-categories fields under "Others"
- [x] CSV import API scaffold endpoint (`/api/import/csv`) added (returns `501` until implemented).

## Phase 5: Hardening and Ops

- [ ] Add MFA option.
- [ ] Add audit logs and security alerts.
- [ ] Add scheduled backups + tested restore process.
- [ ] Add CI checks (lint, typecheck, tests).

## Implemented Enhancements (Beyond Original Phase Scope)

- [x] Visual dashboard redesign with stronger hierarchy and improved chart/card presentation.
- [x] Collapsible desktop sidebar navigation.
- [x] Mobile slide-out menu and bottom action bar for navigation.
- [x] Quick-add expense floating action button for daily entry flow.
- [x] Landing page redesign with status panel and action-oriented CTAs.
- [x] Optional `payee` on expense create/update.
- [x] Optional `source` on income create/update.
- [x] Health check endpoint (`GET /api/health`) for uptime probes.

## Definition of Done (MVP)

- [x] User can sign up, sign in, and sign out securely.
- [x] User can create, edit, delete, and list own expenses.
- [x] User can view monthly/yearly spending charts.
- [x] Data is persisted on DS920+ PostgreSQL.
- [x] App is reachable over HTTPS and is mobile responsive.
