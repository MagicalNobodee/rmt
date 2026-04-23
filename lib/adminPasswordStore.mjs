export function toAdminPasswordSnapshotRecord({
  userId,
  username,
  plaintextPassword,
  source,
}) {
  return {
    user_id: String(userId ?? "").trim(),
    username: String(username ?? "").trim() || String(userId ?? "").trim(),
    plaintext_password: String(plaintextPassword ?? ""),
    source,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertAdminPasswordSnapshot({
  supabase,
  userId,
  username,
  plaintextPassword,
  source,
}) {
  const record = toAdminPasswordSnapshotRecord({
    userId,
    username,
    plaintextPassword,
    source,
  });

  const { error } = await supabase.from("admin_account_password_snapshots").upsert(record);

  if (error) throw error;

  return record;
}

export async function getAdminPasswordSnapshotByUserId({ supabase, userId }) {
  const { data, error } = await supabase
    .from("admin_account_password_snapshots")
    .select("user_id, username, plaintext_password, source, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    plaintextPassword: data.plaintext_password ?? "",
  };
}
