# Database Schema

## Notes

- PostgreSQL current stable major.
- Auth.js manages auth/session tables.
- Domain tables below reference `users.id`.
- Amounts are stored as integer cents to avoid floating-point errors.
- If your auth adapter uses string IDs, switch `uuid` foreign keys to `text`.

## Core Tables

```sql
create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references users(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_categories_user_name
  on categories (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id),
  amount_cents bigint not null check (amount_cents > 0),
  spent_on date not null,
  payee text not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_expenses_user_date on expenses (user_id, spent_on desc);
create index if not exists ix_expenses_user_category_date on expenses (user_id, category_id, spent_on desc);

create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  earned_on date not null,
  source text not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_incomes_user_date on incomes (user_id, earned_on desc);

create table if not exists networth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  snapshot_on date not null,
  total_assets_cents bigint not null check (total_assets_cents >= 0),
  total_liabilities_cents bigint not null check (total_liabilities_cents >= 0),
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_on)
);

create index if not exists ix_networth_user_date on networth_snapshots (user_id, snapshot_on desc);
```

## Optional Future Tables

- `import_jobs` for CSV import history and status.
- `export_jobs` if exports become async.
- `accounts` if you later track balances per account.

## Query Patterns

- Expense list: filter by `user_id`, date range, category, and payee.
- Dashboard aggregates:
  - monthly spend total
  - yearly spend total
  - spend by category
  - net worth trend by snapshot date

## Data Isolation Rule

Every domain table has `user_id`.  
All reads and writes must include authenticated user context and filter by that `user_id`.
