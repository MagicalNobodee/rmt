# Username Password Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the anonymous public flow with a username-and-password account flow where visitors can browse without signing in, but posting ratings, voting, and submitting contact tickets requires an account.

**Architecture:** Reuse Supabase Auth for password storage and sessions, but hide email from the user by mapping each lowercase username to an internal synthetic email. Add a separate signed cookie to prevent creating more than one account per browser, then restore the gated UI and server actions around the Supabase session.

**Tech Stack:** Next.js App Router, Supabase SSR/Auth/Admin APIs, signed HTTP-only cookies, Node `node:test`

---

### Task 1: Auth Helper Primitives

**Files:**
- Create: `lib/publicUserAuth.js`
- Create: `tests/public-user-auth.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  INTERNAL_AUTH_EMAIL_DOMAIN,
  isValidPublicUsername,
  publicUsernameToInternalEmail,
  internalEmailToPublicUsername,
} from "../lib/publicUserAuth.js";

test("accepts lowercase usernames with supported punctuation", () => {
  assert.equal(isValidPublicUsername("eric"), true);
  assert.equal(isValidPublicUsername("eric.wang"), true);
  assert.equal(isValidPublicUsername("eric_wang"), true);
  assert.equal(isValidPublicUsername("eric-01"), true);
});

test("rejects uppercase, spaces, and edge punctuation", () => {
  assert.equal(isValidPublicUsername("Eric"), false);
  assert.equal(isValidPublicUsername("eric wang"), false);
  assert.equal(isValidPublicUsername(".eric"), false);
  assert.equal(isValidPublicUsername("eric-"), false);
});

test("maps username to synthetic auth email and back", () => {
  const email = publicUsernameToInternalEmail("eric.wang");
  assert.equal(email, `eric.wang@${INTERNAL_AUTH_EMAIL_DOMAIN}`);
  assert.equal(internalEmailToPublicUsername(email), "eric.wang");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/public-user-auth.test.mjs`  
Expected: FAIL because `lib/publicUserAuth.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const INTERNAL_AUTH_EMAIL_DOMAIN = "rmt.local";

const PUBLIC_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])?$/;

export function isValidPublicUsername(username) {
  return PUBLIC_USERNAME_PATTERN.test(String(username ?? ""));
}

export function publicUsernameToInternalEmail(username) {
  return `${username}@${INTERNAL_AUTH_EMAIL_DOMAIN}`;
}

export function internalEmailToPublicUsername(email) {
  const value = String(email ?? "");
  const suffix = `@${INTERNAL_AUTH_EMAIL_DOMAIN}`;
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/public-user-auth.test.mjs`  
Expected: PASS

### Task 2: Browser Lock And Session Actions

**Files:**
- Create: `lib/publicUserSession.ts`
- Modify: `lib/actions.ts`

- [ ] Add signed `rmt_signup_lock` cookie helpers, plus username/password sign-in, sign-up, sign-out, and current-user resolution helpers.
- [ ] Reuse Supabase Auth sessions with synthetic emails derived from usernames.
- [ ] Enforce "same cookie can only create one account" during sign-up only.

### Task 3: Restore Logged-In UI

**Files:**
- Create: `app/login/page.tsx`
- Modify: `components/HeyMenu.tsx`
- Modify: `components/Header.tsx`
- Modify: `app/teachers/page.tsx`
- Modify: `app/teachers/[id]/page.tsx`
- Modify: `app/teachers/[id]/rate/page.tsx`
- Modify: `components/ReviewVoteButtons.tsx`

- [ ] Restore gated entry points so browse is public, but rating/voting redirects to `/login` when not signed in.
- [ ] Show username-based account menu with links to `My Ratings`, `My Tickets`, and logout.

### Task 4: Restore Account-Owned Pages And Write Actions

**Files:**
- Create: `app/me/ratings/page.tsx`
- Create: `app/me/ratings/[reviewId]/edit/page.tsx`
- Create: `app/me/tickets/page.tsx`
- Create: `app/me/tickets/[id]/page.tsx`
- Modify: `app/contact/page.tsx`
- Modify: `lib/actions.ts`

- [ ] Restore authenticated-only ratings/tickets pages.
- [ ] Re-enable review update/delete for the signed-in account.
- [ ] Require sign-in for contact ticket submission and tie tickets to the signed-in account.
- [ ] Enforce one review per `(user_id, teacher_id)` in server logic before insert.

### Task 5: Admin And Copy Cleanup

**Files:**
- Modify: `app/admin/(protected)/reviews/page.tsx`
- Modify: `app/admin/(protected)/reviews/[id]/edit/page.tsx`
- Modify: `app/admin/(protected)/tickets/page.tsx`
- Modify: `app/admin/(protected)/tickets/[id]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/privacy-policy/page.tsx`
- Modify: `app/terms-and-conditions/page.tsx`
- Delete: `lib/publicSession.ts`

- [ ] Replace anonymous labels with username labels in admin views.
- [ ] Update public copy so it describes username/password accounts instead of anonymous posting or school-email auth.

### Task 6: Verify

**Files:**
- Modify: `package.json`

- [ ] Add a `test` script for `node --test tests/public-user-auth.test.mjs`.
- [ ] Run `pnpm test`
- [ ] Run `pnpm build`
