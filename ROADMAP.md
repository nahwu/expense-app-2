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

- [ ] Income CRUD.
- [ ] Net worth snapshot CRUD.
- [ ] Cashflow chart (income vs expenses).
- [ ] Net worth trend chart (monthly/yearly).

## Phase 3: Reporting

- [ ] Spending by category chart.
- [ ] Year-over-year spend comparison.
- [ ] Data tables with export buttons.

## Phase 4: Import/Export

- [ ] CSV export for expenses, incomes, and net worth snapshots.
- [ ] CSV import with validation report and partial-failure handling.
- [ ] Duplicate-detection strategy for import.

## Phase 5: Hardening and Ops

- [ ] Add MFA option.
- [ ] Add audit logs and security alerts.
- [ ] Add scheduled backups + tested restore process.
- [ ] Add CI checks (lint, typecheck, tests).

## Definition of Done (MVP)

- [x] User can sign up, sign in, and sign out securely.
- [x] User can create, edit, delete, and list own expenses.
- [ ] User can view monthly/yearly spending charts.
- [ ] Data is persisted on DS920+ PostgreSQL.
- [ ] App is reachable over HTTPS and is mobile responsive.
