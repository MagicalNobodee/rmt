alter table public.admin_account_password_snapshots
  add column if not exists plaintext_password text;

alter table public.admin_account_password_snapshots
  alter column encrypted_password drop not null;

alter table public.admin_account_password_snapshots
  alter column encryption_iv drop not null;

alter table public.admin_account_password_snapshots
  alter column encryption_tag drop not null;
