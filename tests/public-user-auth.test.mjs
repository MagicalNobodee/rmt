import test from "node:test";
import assert from "node:assert/strict";
import {
  INTERNAL_AUTH_EMAIL_DOMAIN,
  isValidPublicUsername,
  publicUsernameToInternalEmail,
  internalEmailToPublicUsername,
  publicUsernameFromUser,
  publicContactEmailToUsername,
} from "../lib/publicUserAuth.mjs";

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

test("falls back to synthetic email when metadata username is invalid", () => {
  const user = {
    email: publicUsernameToInternalEmail("eric.wang"),
    user_metadata: {
      username: "Eric Wang",
    },
  };

  assert.equal(publicUsernameFromUser(user), "eric.wang");
});

test("reads public username from stored ticket contact email", () => {
  assert.equal(publicContactEmailToUsername("eric.wang@rmt.local"), "eric.wang");
  assert.equal(publicContactEmailToUsername("legacy_user"), "legacy_user");
  assert.equal(publicContactEmailToUsername("person@example.com"), "person@example.com");
});
