create table if not exists public.public_user_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('signin', 'signup')),
  ip_address text,
  user_agent text,
  accept_language text,
  fingerprint_hash text,
  created_at timestamptz not null default now()
);

create index if not exists public_user_login_events_user_id_created_at_idx
  on public.public_user_login_events (user_id, created_at desc);

create index if not exists public_user_login_events_fingerprint_hash_idx
  on public.public_user_login_events (fingerprint_hash)
  where fingerprint_hash is not null;

alter table public.public_user_login_events enable row level security;
