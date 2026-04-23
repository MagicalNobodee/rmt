import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase";
import { publicUsernameFromUser, publicUsernameToInternalEmail } from "./publicUserAuth.mjs";

const SIGNUP_LOCK_COOKIE = "rmt_signup_lock";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
type PublicAuthUser = User & { email: string };

type SignupLockPayload = {
  u: string;
  iat: number;
  exp: number;
};

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function base64urlEncode(buf: Buffer) {
  return buf.toString("base64").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

function base64urlDecode(s: string) {
  let b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

function hmacSha256(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSignupLockToken(username: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SignupLockPayload = {
    u: username,
    iat: now,
    exp: now + MAX_AGE_SECONDS,
  };

  const body = base64urlEncode(Buffer.from(JSON.stringify(payload), "utf-8"));
  const sig = base64urlEncode(hmacSha256(mustGetEnv("ADMIN_COOKIE_SECRET"), body));
  return `${body}.${sig}`;
}

export function verifySignupLockToken(token: string | undefined | null) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = base64urlEncode(hmacSha256(mustGetEnv("ADMIN_COOKIE_SECRET"), body));
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(base64urlDecode(body).toString("utf-8")) as SignupLockPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.u || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getPublicSignupLock() {
  return verifySignupLockToken(cookies().get(SIGNUP_LOCK_COOKIE)?.value);
}

export function hasPublicSignupLock() {
  return !!getPublicSignupLock();
}

export function setPublicSignupLock(username: string) {
  cookies().set(SIGNUP_LOCK_COOKIE, createSignupLockToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function safeRedirectPath(p: string, fallback = "/teachers") {
  const s = (p || "").trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (s.includes("\\") || s.includes("\n") || s.includes("\r")) return fallback;
  return s;
}

export function publicUsernameToHey(username?: string | null) {
  if (!username) return "GUEST";
  return username.replaceAll(/[._-]+/g, " ").toUpperCase();
}

export function isPublicAuthUser(user: User | null | undefined): user is PublicAuthUser {
  if (!user?.email) return false;
  const username = publicUsernameFromUser(user);
  if (!username) return false;
  return user.email === publicUsernameToInternalEmail(username);
}

export async function getCurrentPublicUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!isPublicAuthUser(user)) return null;

  return {
    supabase,
    user,
    username: publicUsernameFromUser(user)!,
  };
}

export async function requirePublicUserOrRedirect(redirectTo = "/teachers") {
  const current = await getCurrentPublicUser();
  if (!current) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return current;
}
