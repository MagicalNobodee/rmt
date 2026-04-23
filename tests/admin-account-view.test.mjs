import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  buildLoginFingerprint,
  toAdminAccountView,
} from "../lib/adminAccountView.mjs";
import { publicUsernameToInternalEmail } from "../lib/publicUserAuth.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

test("summarizes public auth account and shows missing plaintext snapshot state", () => {
  const view = toAdminAccountView(
    {
      id: "user-1",
      email: publicUsernameToInternalEmail("student.one"),
      created_at: "2026-04-01T10:00:00.000Z",
      last_sign_in_at: "2026-04-24T02:00:00.000Z",
      user_metadata: {
        username: "student.one",
        kind: "public_user",
      },
      app_metadata: {
        provider: "email",
      },
      identities: [{ provider: "email" }],
    },
    {
      reviewCount: 2,
      loginEvents: [
        {
          event_type: "signin",
          ip_address: "203.0.113.10",
          user_agent: "Mozilla/5.0",
          accept_language: "en-US,en;q=0.8",
          fingerprint_hash: "abc123",
          created_at: "2026-04-24T02:00:00.000Z",
        },
      ],
    }
  );

  assert.equal(view.username, "student.one");
  assert.equal(view.internalEmail, "student.one@rmt.local");
  assert.equal(view.reviewCount, 2);
  assert.equal(view.password.rawAvailable, false);
  assert.match(view.password.label, /no stored plaintext password/i);
  assert.equal(view.login.latest?.ipAddress, "203.0.113.10");
  assert.equal(view.login.latest?.fingerprintHash, "abc123");
});

test("falls back to username parsed from the internal auth email", () => {
  const view = toAdminAccountView({
    id: "user-2",
    email: publicUsernameToInternalEmail("email.only"),
    user_metadata: {
      username: "Email Only",
    },
  });

  assert.equal(view.username, "email.only");
});

test("uses the real email label for legacy email-based accounts", () => {
  const view = toAdminAccountView({
    id: "legacy-1",
    email: "legacy@example.com",
    last_sign_in_at: "2026-04-24T03:00:00.000Z",
  });

  assert.equal(view.displayLabel, "legacy@example.com");
  assert.equal(view.username, "");
  assert.equal(view.accountType, "legacy_email");
});

test("exposes decrypted password details only when a snapshot exists", () => {
  const view = toAdminAccountView(
    { id: "user-3", email: publicUsernameToInternalEmail("student.two") },
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

test("accounts index only renders summary fields and links to detail pages", () => {
  const source = readFileSync(join(repoRoot, "app/admin/(protected)/accounts/page.tsx"), "utf8");

  assert.match(source, /Latest login/);
  assert.match(source, /Reviews/);
  assert.match(source, /href=\{`\/admin\/accounts\/\$\{encodeURIComponent\(view\.id\)\}`\}/);
});

test("account detail page exists and renders password plus reviews sections", () => {
  const path = join(repoRoot, "app/admin/(protected)/accounts/[id]/page.tsx");
  assert.equal(existsSync(path), true);

  const source = readFileSync(path, "utf8");
  assert.match(source, /Password/);
  assert.match(source, /Posted Reviews/);
  assert.match(source, /Login Fingerprint History/);
});

test("builds a stable login fingerprint from request headers", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.7, 10.0.0.1",
    "user-agent": "Mozilla/5.0 Test Browser",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  });

  const first = buildLoginFingerprint(headers, "secret");
  const second = buildLoginFingerprint(headers, "secret");

  assert.equal(first.ipAddress, "198.51.100.7");
  assert.equal(first.userAgent, "Mozilla/5.0 Test Browser");
  assert.equal(first.acceptLanguage, "zh-CN,zh;q=0.9,en;q=0.8");
  assert.match(first.fingerprintHash, /^[a-f0-9]{64}$/);
  assert.equal(second.fingerprintHash, first.fingerprintHash);
});
