# Admin Account Management Design

Date: 2026-04-24

## Goal

Replace the current all-in-one admin accounts page with a lighter account list plus a dedicated account detail page, while adding admin-visible plaintext password support for future signups and future password resets.

## Scope

In scope:
- Turn `/admin/accounts` into a summary list page.
- Add `/admin/accounts/[id]` as the dedicated detail page.
- Show concise list fields: username, latest login time, review count.
- Keep the existing detail information on the new detail page: auth metadata, fingerprint history, posted reviews, and account status.
- Allow admins to view a stored plaintext password only when the system has a reversible saved copy.
- Save a reversible password copy for:
  - new public-user signups
  - future admin-triggered password resets
- Provide an admin password reset action that generates a new password, updates Supabase Auth, stores the reversible copy, and makes the new plaintext visible in the detail page.

Out of scope:
- Recovering existing users' current passwords from Supabase Auth.
- Backfilling plaintext passwords for already-created accounts.
- Changing the public login UX.

## Product Decisions

### Accounts Index

`/admin/accounts` becomes a management index instead of a giant detail surface.

The page keeps the current neutral admin styling and search/filter affordances, but each account row only shows:
- username
- latest login time
- review count
- link to the detail page

The row should be compact and scannable, with the most important operational signal being "who is this account, when did it last log in, and how active is it".

### Account Detail

`/admin/accounts/[id]` becomes the full management page for one account.

It contains:
- username
- internal auth email
- current stored plaintext password if available
- password source (`signup` or `admin_reset`)
- latest login fingerprint summary
- fingerprint history
- auth metadata
- posted reviews, reusing the current admin review-management presentation and edit link behavior

For legacy accounts that do not yet have a stored plaintext password, the password section explicitly says that no stored plaintext password exists yet and instructs the admin to reset the password to create one.

### Plaintext Password Visibility

The system cannot read existing passwords back out of Supabase Auth. Because of that, "view plaintext password" is defined as:
- show the currently stored reversible password snapshot if one exists
- otherwise show a clear empty state
- provide an admin reset action that creates a new password snapshot going forward

This satisfies the request for plaintext visibility without pretending that old passwords are recoverable.

## Architecture

### Routing

- Modify: `app/admin/(protected)/accounts/page.tsx`
- Add: `app/admin/(protected)/accounts/[id]/page.tsx`

The existing page logic will be split into:
- list-page query logic
- per-account detail-page query logic

### Password Snapshot Storage

Add a new table dedicated to admin-readable reversible password snapshots.

Chosen table: `public.admin_account_password_snapshots`

Columns:
- `user_id uuid primary key`
- `username text not null`
- `encrypted_password text not null`
- `encryption_iv text not null`
- `encryption_tag text not null`
- `source text not null check (source in ('signup', 'admin_reset'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Why a separate table:
- keeps reversible credentials isolated from auth metadata and reviews
- makes lifecycle rules explicit
- allows old accounts to remain null-state without schema hacks on auth tables

### Encryption

Use server-side reversible encryption with a dedicated environment variable, not hashing.

Chosen implementation:
- algorithm: AES-256-GCM
- key env var: `ADMIN_PASSWORD_ENCRYPTION_KEY`
- helper module stores and retrieves:
  - ciphertext
  - IV
  - auth tag

Behavior:
- encrypt before database write
- decrypt only in protected admin server code
- never expose encrypted values to client components

If the encryption key is missing or malformed:
- signup and reset flows should fail loudly on the server side
- the admin detail page should show a clear operational error instead of fake data

## Data Flow

### Signup

When `signUpWithUsernameAndPassword` succeeds:
1. create Supabase Auth user
2. encrypt the chosen password
3. upsert the password snapshot row with source `signup`
4. continue with the existing sign-in redirect flow

If snapshot storage fails after auth user creation:
- surface a clear failure
- do not silently claim success

### Admin Reset

On account detail page:
1. admin clicks reset
2. server action generates a strong password
3. Supabase Auth password is updated for that user
4. snapshot table is upserted with the new encrypted value and source `admin_reset`
5. account detail page reloads with the new plaintext visible

The reset flow should prefer generated passwords over manually entered ones to reduce operator error and keep the action fast.

### Account List Queries

The list page needs only:
- auth users filtered to public accounts
- review counts grouped by `user_id`
- latest login time derived from:
  - latest `public_user_login_events.created_at` when available
  - fallback to `auth.users.last_sign_in_at`

This page should not fetch full review bodies, fingerprint histories, or full auth JSON payloads.

### Account Detail Queries

The detail page fetches:
- auth user
- password snapshot row
- fingerprint events for the user
- reviews for the user
- derived review count

## Error Handling

- Old accounts with no snapshot:
  - show `No stored plaintext password yet`
  - show reset CTA
- Missing encryption key:
  - reset action fails with admin-facing error
  - detail page password card shows config problem
- Snapshot row exists but decrypt fails:
  - show corruption/config error
  - do not display partial garbage
- Login event table missing:
  - keep current warning behavior

## Testing

### Unit Tests

- add encryption helper tests:
  - encrypt/decrypt round trip
  - wrong key fails
- extend account-view tests:
  - list summary fields use latest login fallback logic
  - detail view marks password as available only when snapshot exists

### Integration-Level File Tests

- list page source contains list-only account presentation
- detail page source contains review section, fingerprint section, and password section
- reset action source updates both Supabase Auth and password snapshot persistence

### Manual Verification

1. Create a new public account.
2. Open `/admin/accounts`.
3. Confirm the list shows the new username, latest login time, and review count.
4. Open the detail page.
5. Confirm the password is visible in plaintext.
6. Trigger reset.
7. Confirm the newly generated password is visible and the old one is replaced.
8. Confirm an old pre-feature account shows the "no stored plaintext password yet" state.

## Risks

- Reversible password storage is materially more sensitive than normal auth storage.
- A leaked encryption key would expose all stored password snapshots.
- The feature only works for future signups and future resets; old passwords remain unrecoverable.

## Mitigations

- use a dedicated encryption key
- keep encryption/decryption strictly server-side
- never show plaintext passwords on the list page
- clearly label legacy accounts with no stored password snapshot
- restrict all password visibility to existing admin auth gates

## Implementation Shape

1. Add encrypted password snapshot storage and helpers.
2. Hook signup flow to persist a snapshot.
3. Split account management into index and detail routes.
4. Add admin reset-password action and detail-page UI.
5. Add tests for snapshot helpers and account-route behavior.
