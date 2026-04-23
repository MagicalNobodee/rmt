create table if not exists public.admin_account_password_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  encrypted_password text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  source text not null check (source in ('signup', 'admin_reset')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_account_password_snapshots_updated_at_idx
  on public.admin_account_password_snapshots (updated_at desc);

alter table public.admin_account_password_snapshots enable row level security;
