import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptAdminPasswordSnapshot,
  encryptAdminPasswordSnapshot,
  generateAdminAccountPassword,
} from "../lib/adminPasswordStore.mjs";

const PRIMARY_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const SECONDARY_KEY = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

test("encrypts and decrypts admin password snapshots", () => {
  const encrypted = encryptAdminPasswordSnapshot("Plaintext123!", PRIMARY_KEY);

  assert.equal(typeof encrypted.encrypted_password, "string");
  assert.equal(typeof encrypted.encryption_iv, "string");
  assert.equal(typeof encrypted.encryption_tag, "string");
  assert.equal(
    decryptAdminPasswordSnapshot(encrypted, PRIMARY_KEY),
    "Plaintext123!"
  );
});

test("rejects decrypting with the wrong key", () => {
  const encrypted = encryptAdminPasswordSnapshot("Plaintext123!", PRIMARY_KEY);

  assert.throws(() => decryptAdminPasswordSnapshot(encrypted, SECONDARY_KEY));
});

test("formats generated admin reset passwords with mixed character classes", () => {
  const password = generateAdminAccountPassword();

  assert.equal(password.length >= 14, true);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
});
