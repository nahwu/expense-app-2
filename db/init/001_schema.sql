create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id text null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_categories_user_name
  on categories (coalesce(user_id, '__system__'), lower(name));

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
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
  user_id text not null,
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
  user_id text not null,
  snapshot_on date not null,
  total_assets_cents bigint not null check (total_assets_cents >= 0),
  total_liabilities_cents bigint not null check (total_liabilities_cents >= 0),
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_on)
);

create index if not exists ix_networth_user_date on networth_snapshots (user_id, snapshot_on desc);

insert into categories (user_id, name, is_system)
values
  (null, 'Food', true),
  (null, 'Transport', true),
  (null, 'Housing', true),
  (null, 'Utilities', true),
  (null, 'Healthcare', true),
  (null, 'Entertainment', true),
  (null, 'Other', true)
on conflict do nothing;
