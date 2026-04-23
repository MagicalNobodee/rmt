import crypto from "node:crypto";

function passwordKeyBuffer(secret) {
  const normalized = String(secret ?? "").trim();
  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error("ADMIN_PASSWORD_ENCRYPTION_KEY must be a 64-character hex string.");
  }
  return Buffer.from(normalized, "hex");
}

function getPasswordSecret(secret) {
  const resolved = secret ?? process.env.ADMIN_PASSWORD_ENCRYPTION_KEY;
  return passwordKeyBuffer(resolved);
}

function toBase64(value) {
  return Buffer.from(value).toString("base64");
}

function fromBase64(value) {
  return Buffer.from(String(value ?? ""), "base64");
}

export function encryptAdminPasswordSnapshot(password, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getPasswordSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_password: toBase64(encrypted),
    encryption_iv: toBase64(iv),
    encryption_tag: toBase64(tag),
  };
}

export function decryptAdminPasswordSnapshot(row, secret) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getPasswordSecret(secret),
    fromBase64(row.encryption_iv)
  );
  decipher.setAuthTag(fromBase64(row.encryption_tag));
  const decrypted = Buffer.concat([
    decipher.update(fromBase64(row.encrypted_password)),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function randomFrom(alphabet) {
  const index = crypto.randomInt(0, alphabet.length);
  return alphabet[index];
}

function shuffle(value) {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function generateAdminAccountPassword(length = 16) {
  const safeLength = Math.max(14, Math.trunc(Number(length) || 16));
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = `${upper}${lower}${digits}`;

  let nextPassword = randomFrom(upper) + randomFrom(lower) + randomFrom(digits);
  while (nextPassword.length < safeLength) {
    nextPassword += randomFrom(all);
  }

  return shuffle(nextPassword);
}

export async function upsertAdminPasswordSnapshot({
  supabase,
  userId,
  username,
  plaintextPassword,
  source,
  secret = undefined,
}) {
  const encrypted = encryptAdminPasswordSnapshot(plaintextPassword, secret);
  const { error } = await supabase.from("admin_account_password_snapshots").upsert({
    user_id: userId,
    username: String(username ?? "").trim() || String(userId),
    ...encrypted,
    source,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  return encrypted;
}

export async function getAdminPasswordSnapshotByUserId({ supabase, userId, secret = undefined }) {
  const { data, error } = await supabase
    .from("admin_account_password_snapshots")
    .select("user_id, username, encrypted_password, encryption_iv, encryption_tag, source, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    plaintextPassword: decryptAdminPasswordSnapshot(data, secret),
  };
}
