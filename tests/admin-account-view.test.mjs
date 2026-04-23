import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLoginFingerprint,
  toAdminAccountView,
} from "../lib/adminAccountView.mjs";
import { publicUsernameToInternalEmail } from "../lib/publicUserAuth.mjs";

test("summarizes public auth account without exposing plaintext passwords", () => {
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
  assert.match(view.password.label, /cannot be viewed/i);
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
