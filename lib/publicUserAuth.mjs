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

export function publicUsernameFromUser(user) {
  const metadataUsername = user?.user_metadata?.username;
  if (typeof metadataUsername === "string" && isValidPublicUsername(metadataUsername)) {
    return metadataUsername;
  }

  const emailUsername = internalEmailToPublicUsername(user?.email);
  return isValidPublicUsername(emailUsername) ? emailUsername : "";
}

export function publicContactEmailToUsername(email) {
  const internalUsername = internalEmailToPublicUsername(email);
  if (internalUsername) return internalUsername;

  return String(email ?? "").trim();
}
