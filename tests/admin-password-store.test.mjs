import test from "node:test";
import assert from "node:assert/strict";
import { toAdminPasswordSnapshotRecord } from "../lib/adminPasswordStore.mjs";

test("builds a plaintext admin password snapshot record for signup", () => {
  const record = toAdminPasswordSnapshotRecord({
    userId: "user-1",
    username: "student.one",
    plaintextPassword: "Plaintext123!",
    source: "signup",
  });

  assert.equal(record.user_id, "user-1");
  assert.equal(record.username, "student.one");
  assert.equal(record.plaintext_password, "Plaintext123!");
  assert.equal(record.source, "signup");
});

test("does not require encryption metadata for stored admin password snapshots", () => {
  const record = toAdminPasswordSnapshotRecord({
    userId: "user-2",
    username: "",
    plaintextPassword: "Plaintext123!",
    source: "signup",
  });

  assert.equal("encrypted_password" in record, false);
  assert.equal("encryption_iv" in record, false);
  assert.equal("encryption_tag" in record, false);
  assert.equal(record.username, "user-2");
});
