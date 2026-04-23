# Admin Account Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split admin account management into a compact list page plus a dedicated detail page, while storing and showing plaintext passwords for future signups and admin resets, and including legacy email-based accounts in the admin list.

**Architecture:** Keep `/admin/accounts` as a server-rendered summary index and move the current full account surface to `/admin/accounts/[id]`. Add a server-only reversible password snapshot layer backed by a new Supabase table and wire it into public signup plus a new admin reset action. Reuse existing review and login-event data, but broaden account inclusion rules so older email-based accounts are also visible.

**Tech Stack:** Next.js App Router, server components, server actions, Supabase Auth admin API, Supabase Postgres migrations, Node test runner, AES-256-GCM via Node `crypto`

---

## File Map

- Create: `app/admin/(protected)/accounts/[id]/page.tsx`
- Create: `lib/adminPasswordStore.mjs`
- Create: `supabase/migrations/20260424030000_admin_account_password_snapshots.sql`
- Create: `tests/admin-password-store.test.mjs`
- Modify: `app/admin/(protected)/accounts/page.tsx`
- Modify: `lib/actions.ts`
- Modify: `lib/admin/actions.ts`
- Modify: `lib/adminAccountView.mjs`
- Modify: `tests/admin-account-view.test.mjs`
- Modify: `docs/superpowers/specs/2026-04-24-admin-account-management-design.md`

### Task 1: Lock Down Account Shapes And Password Storage With Tests

**Files:**
- Create: `tests/admin-password-store.test.mjs`
- Modify: `tests/admin-account-view.test.mjs`
- Test: `tests/admin-password-store.test.mjs`
- Test: `tests/admin-account-view.test.mjs`

- [ ] **Step 1: Write the failing encryption helper tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptAdminPasswordSnapshot,
  decryptAdminPasswordSnapshot,
} from "../lib/adminPasswordStore.mjs";

test("encrypts and decrypts admin password snapshots", () => {
  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const encrypted = encryptAdminPasswordSnapshot("Plaintext123!", key);

  assert.equal(typeof encrypted.encrypted_password, "string");
  assert.equal(
    decryptAdminPasswordSnapshot(encrypted, key),
    "Plaintext123!"
  );
});

test("rejects decrypting with the wrong key", () => {
  const encrypted = encryptAdminPasswordSnapshot(
    "Plaintext123!",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );

  assert.throws(() =>
    decryptAdminPasswordSnapshot(
      encrypted,
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    )
  );
});
```

- [ ] **Step 2: Run the new helper tests to verify RED**

Run: `node --test tests/admin-password-store.test.mjs`
Expected: FAIL with module/function-not-found errors for `lib/adminPasswordStore.mjs`.

- [ ] **Step 3: Extend account view tests for legacy email accounts and password snapshot availability**

```js
test("uses the real email label for legacy email-based accounts", () => {
  const view = toAdminAccountView({
    id: "legacy-1",
    email: "legacy@example.com",
    last_sign_in_at: "2026-04-24T03:00:00.000Z",
  });

  assert.equal(view.displayLabel, "legacy@example.com");
  assert.equal(view.username, "");
});

test("exposes decrypted password details only when a snapshot exists", () => {
  const view = toAdminAccountView(
    { id: "user-1", email: "legacy@example.com" },
    {
      passwordSnapshot: {
        plaintextPassword: "Plaintext123!",
        source: "admin_reset",
        updated_at: "2026-04-24T05:00:00.000Z",
      },
    }
  );

  assert.equal(view.password.rawAvailable, true);
  assert.equal(view.password.value, "Plaintext123!");
  assert.equal(view.password.source, "admin_reset");
});
```

- [ ] **Step 4: Run the account view tests to verify RED**

Run: `node --test tests/admin-account-view.test.mjs`
Expected: FAIL because `displayLabel`, snapshot-driven password fields, or legacy-email behavior are not implemented yet.

- [ ] **Step 5: Commit the red test additions**

```bash
git add tests/admin-password-store.test.mjs tests/admin-account-view.test.mjs
git commit -m "test: cover admin account password snapshots"
```

### Task 2: Implement Password Snapshot Encryption And Signup Persistence

**Files:**
- Create: `lib/adminPasswordStore.mjs`
- Create: `supabase/migrations/20260424030000_admin_account_password_snapshots.sql`
- Modify: `lib/actions.ts`
- Test: `tests/admin-password-store.test.mjs`

- [ ] **Step 1: Implement the server-only encryption helper**

```js
import crypto from "node:crypto";

function passwordKeyBuffer(secret) {
  const normalized = String(secret ?? "").trim();
  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error("ADMIN_PASSWORD_ENCRYPTION_KEY must be a 64-char hex string.");
  }
  return Buffer.from(normalized, "hex");
}

export function encryptAdminPasswordSnapshot(password, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", passwordKeyBuffer(secret), iv);
  const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_password: encrypted.toString("base64"),
    encryption_iv: iv.toString("base64"),
    encryption_tag: tag.toString("base64"),
  };
}
```

- [ ] **Step 2: Add decrypt + snapshot formatting helpers**

```js
export function decryptAdminPasswordSnapshot(row, secret) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    passwordKeyBuffer(secret),
    Buffer.from(row.encryption_iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(row.encryption_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_password, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
```

- [ ] **Step 3: Add the migration for snapshot storage**

```sql
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
```

- [ ] **Step 4: Persist snapshots during signup**

```js
import { encryptAdminPasswordSnapshot } from "./adminPasswordStore.mjs";

const encrypted = encryptAdminPasswordSnapshot(
  password,
  process.env.ADMIN_PASSWORD_ENCRYPTION_KEY
);

await supabaseAdmin.from("admin_account_password_snapshots").upsert({
  user_id: createdUserResult.user.id,
  username,
  ...encrypted,
  source: "signup",
});
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:
- `node --test tests/admin-password-store.test.mjs`
- `node --test tests/admin-account-view.test.mjs`

Expected: both PASS.

- [ ] **Step 6: Commit the password snapshot foundation**

```bash
git add lib/adminPasswordStore.mjs lib/actions.ts supabase/migrations/20260424030000_admin_account_password_snapshots.sql tests/admin-password-store.test.mjs tests/admin-account-view.test.mjs
git commit -m "feat: store admin-readable password snapshots"
```

### Task 3: Split Accounts Into Index And Detail Routes

**Files:**
- Modify: `app/admin/(protected)/accounts/page.tsx`
- Create: `app/admin/(protected)/accounts/[id]/page.tsx`
- Modify: `lib/adminAccountView.mjs`
- Test: `tests/admin-account-view.test.mjs`

- [ ] **Step 1: Write a failing route-shape test or source assertion**

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("accounts index only renders summary fields and links to detail pages", () => {
  const source = readFileSync(join(repoRoot, "app/admin/(protected)/accounts/page.tsx"), "utf8");
  assert.match(source, /href=\\{`\\/admin\\/accounts\\//);
  assert.match(source, /Latest login/);
  assert.match(source, /Reviews/);
});

test("account detail page exists and renders password plus reviews sections", () => {
  const source = readFileSync(join(repoRoot, "app/admin/(protected)/accounts/[id]/page.tsx"), "utf8");
  assert.match(source, /Posted Reviews/);
  assert.match(source, /Password/);
  assert.match(source, /Login Fingerprint History/);
});
```

- [ ] **Step 2: Run the focused route-shape tests to verify RED**

Run: `node --test tests/admin-account-view.test.mjs`
Expected: FAIL because the detail page file does not exist yet and the list page still renders full-detail content.

- [ ] **Step 3: Extend account-view derivation logic for both usernames and legacy emails**

```js
export function toAdminAccountView(user, options = {}) {
  const username = publicUsernameFromUser(user) || internalEmailToPublicUsername(user?.email) || "";
  const displayLabel = username || user?.email || "—";
  const snapshot = options.passwordSnapshot ?? null;

  return {
    id: user?.id ?? "",
    username,
    displayLabel,
    accountType: username ? "public_username" : "legacy_email",
    // ...
  };
}
```

- [ ] **Step 4: Replace the current accounts page with a summary list**

```tsx
<div className="mt-4 rounded-2xl border bg-white shadow-sm">
  <div className="grid grid-cols-[minmax(0,1.4fr)_180px_120px_120px] gap-4 border-b px-6 py-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
    <div>Account</div>
    <div>Latest login</div>
    <div>Reviews</div>
    <div />
  </div>
  {accountViews.map(({ view }) => (
    <div key={view.id} className="grid grid-cols-[minmax(0,1.4fr)_180px_120px_120px] gap-4 px-6 py-4">
      <div>{view.displayLabel}</div>
      <div>{formatDateTime(view.login.latest?.createdAt ?? view.lastSignInAt)}</div>
      <div>{view.reviewCount}</div>
      <Link href={`/admin/accounts/${encodeURIComponent(view.id)}`}>Manage</Link>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Create the account detail route with the existing detail content**

```tsx
export default async function AdminAccountDetailPage({ params }) {
  const account = await loadAdminAccountDetail(params.id);
  return (
    <div>
      <Link href="/admin/accounts">← Back to accounts</Link>
      <section>{/* password card */}</section>
      <section>{/* fingerprint history */}</section>
      <section>{/* auth metadata */}</section>
      <section>{/* posted reviews */}</section>
    </div>
  );
}
```

- [ ] **Step 6: Ensure legacy email accounts are included**

```js
function isManagedAccount(user) {
  const metadata = userMetadata(user);
  const hasPublicKind = metadata.kind === "public_user";
  const hasSyntheticUsername = Boolean(publicUsernameFromUser(user));
  const hasLegacyEmail = Boolean(user.email && !user.email.endsWith(`@${INTERNAL_AUTH_EMAIL_DOMAIN}`));
  return hasPublicKind || hasSyntheticUsername || hasLegacyEmail;
}
```

- [ ] **Step 7: Run the focused tests to verify GREEN**

Run: `node --test tests/admin-account-view.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit the accounts route split**

```bash
git add app/admin/\(protected\)/accounts/page.tsx app/admin/\(protected\)/accounts/\[id\]/page.tsx lib/adminAccountView.mjs tests/admin-account-view.test.mjs
git commit -m "feat: split admin account list and detail pages"
```

### Task 4: Add Admin Password Reset And Detail Visibility

**Files:**
- Modify: `lib/admin/actions.ts`
- Modify: `app/admin/(protected)/accounts/[id]/page.tsx`
- Modify: `lib/adminPasswordStore.mjs`
- Test: `tests/admin-password-store.test.mjs`
- Test: `tests/admin-account-view.test.mjs`

- [ ] **Step 1: Write a failing reset-password behavior test**

```js
test("formats generated admin reset passwords with mixed character classes", () => {
  const password = generateAdminAccountPassword();
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.equal(password.length >= 14, true);
});
```

- [ ] **Step 2: Run the reset helper test to verify RED**

Run: `node --test tests/admin-password-store.test.mjs`
Expected: FAIL because `generateAdminAccountPassword` does not exist yet.

- [ ] **Step 3: Implement the admin reset action**

```js
export async function adminResetAccountPassword(formData) {
  requireAdmin("/admin/accounts");
  const userId = str(formData.get("userId"));
  const username = str(formData.get("username")) || str(formData.get("fallbackLabel"));
  const nextPassword = generateAdminAccountPassword();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: nextPassword,
  });
  if (error) redirect(`/admin/accounts/${encodeURIComponent(userId)}?error=${encodeURIComponent(error.message)}`);

  await upsertAdminPasswordSnapshot({
    userId,
    username,
    plaintextPassword: nextPassword,
    source: "admin_reset",
  });
}
```

- [ ] **Step 4: Add the detail-page password card + reset CTA**

```tsx
<div className="rounded-2xl border bg-neutral-50 p-4">
  <div className="text-sm font-extrabold">Password</div>
  {view.password.rawAvailable ? (
    <div className="mt-3 font-mono text-sm">{view.password.value}</div>
  ) : (
    <div className="mt-3 text-sm text-neutral-600">
      No stored plaintext password yet. Reset to generate one.
    </div>
  )}
  <form action={adminResetAccountPassword} className="mt-4">
    <input type="hidden" name="userId" value={view.id} />
    <input type="hidden" name="username" value={view.username} />
    <SubmitButton pendingText="Resetting...">Reset Password</SubmitButton>
  </form>
</div>
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:
- `node --test tests/admin-password-store.test.mjs`
- `node --test tests/admin-account-view.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the reset flow**

```bash
git add app/admin/\(protected\)/accounts/\[id\]/page.tsx lib/admin/actions.ts lib/adminPasswordStore.mjs tests/admin-password-store.test.mjs tests/admin-account-view.test.mjs
git commit -m "feat: add admin account password reset"
```

### Task 5: Full Verification And Handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-04-24-admin-account-management-design.md`
- Create: `docs/superpowers/plans/2026-04-24-admin-account-management.md`

- [ ] **Step 1: Re-read the spec and confirm coverage**

Checklist:
- list page is summary-only
- detail page shows old full content
- legacy email accounts appear
- new signups persist password snapshots
- admin reset persists and reveals new plaintext
- old accounts without snapshots show empty state

- [ ] **Step 2: Run full automated verification**

Run:
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm build`

Expected:
- test output shows all suites passing
- typecheck exits 0
- build exits 0 and includes `/admin/accounts` plus `/admin/accounts/[id]`

- [ ] **Step 3: Commit final verified implementation**

```bash
git add app/admin/\(protected\)/accounts app/admin/\(protected\)/accounts/\[id\] lib/actions.ts lib/admin/actions.ts lib/adminAccountView.mjs lib/adminPasswordStore.mjs supabase/migrations/20260424030000_admin_account_password_snapshots.sql tests/admin-account-view.test.mjs tests/admin-password-store.test.mjs docs/superpowers/specs/2026-04-24-admin-account-management-design.md docs/superpowers/plans/2026-04-24-admin-account-management.md
git commit -m "feat: overhaul admin account management"
```
