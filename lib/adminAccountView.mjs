import crypto from "node:crypto";
import { internalEmailToPublicUsername, publicUsernameFromUser } from "./publicUserAuth.mjs";

export const PASSWORD_DISCLOSURE = "Supabase Auth managed; plaintext passwords cannot be viewed.";

function cleanText(value, maxLength = 500) {
  const text = String(value ?? "").replaceAll(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

function getHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) ?? "";

  const lowerName = name.toLowerCase();
  return headers[name] ?? headers[lowerName] ?? "";
}

function firstForwardedIp(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  return text.split(",")[0]?.trim() ?? "";
}

function createFingerprintHash(secret, parts) {
  if (!secret) return "";

  const source = parts.map((part) => part ?? "").join("\n");
  if (!source.trim()) return "";

  return crypto.createHmac("sha256", secret).update(source).digest("hex");
}

export function buildLoginFingerprint(headers, secret) {
  const ipAddress =
    cleanText(firstForwardedIp(getHeader(headers, "x-forwarded-for")), 100) ??
    cleanText(getHeader(headers, "cf-connecting-ip"), 100) ??
    cleanText(getHeader(headers, "x-real-ip"), 100) ??
    cleanText(getHeader(headers, "x-client-ip"), 100);
  const userAgent = cleanText(getHeader(headers, "user-agent"), 500);
  const acceptLanguage = cleanText(getHeader(headers, "accept-language"), 200);

  return {
    ipAddress,
    userAgent,
    acceptLanguage,
    fingerprintHash: createFingerprintHash(secret, [ipAddress, userAgent, acceptLanguage]),
  };
}

function normalizeLoginEvent(event) {
  return {
    eventType: event?.event_type ?? "unknown",
    ipAddress: event?.ip_address ?? null,
    userAgent: event?.user_agent ?? null,
    acceptLanguage: event?.accept_language ?? null,
    fingerprintHash: event?.fingerprint_hash ?? null,
    createdAt: event?.created_at ?? null,
  };
}

function newestFirst(a, b) {
  return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
}

export function toAdminAccountView(user, options = {}) {
  const username = publicUsernameFromUser(user) || internalEmailToPublicUsername(user?.email) || "—";
  const loginEvents = (options.loginEvents ?? []).map(normalizeLoginEvent).sort(newestFirst);
  const identities = Array.isArray(user?.identities) ? user.identities : [];

  return {
    id: user?.id ?? "",
    username,
    internalEmail: user?.email ?? "",
    createdAt: user?.created_at ?? null,
    updatedAt: user?.updated_at ?? null,
    lastSignInAt: user?.last_sign_in_at ?? null,
    emailConfirmedAt: user?.email_confirmed_at ?? user?.confirmed_at ?? null,
    phone: user?.phone ?? null,
    role: user?.role ?? null,
    aud: user?.aud ?? null,
    bannedUntil: user?.banned_until ?? null,
    appMetadata: user?.app_metadata ?? {},
    userMetadata: user?.user_metadata ?? {},
    identities,
    reviewCount: options.reviewCount ?? 0,
    password: {
      rawAvailable: false,
      label: PASSWORD_DISCLOSURE,
    },
    login: {
      latest: loginEvents[0] ?? null,
      events: loginEvents,
    },
  };
}
