// lib/admin/actions.ts
"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { generateAdminAccountPassword, upsertAdminPasswordSnapshot } from "@/lib/adminPasswordStore.mjs";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cleanTicketMessage, normalizeTicketStatus } from "@/lib/ticketWorkflow.mjs";
import { clearAdminSession, requireAdmin, safeNextPath, setAdminSession } from "./session";

function str(v: FormDataEntryValue | null | undefined) {
  return String(v ?? "").trim();
}

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ---------- subjects helpers ----------
function parseSubjects(raw: string): string[] {
  // input: "Math, Physics ,  Chemistry"
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // unique + limit
  const uniq: string[] = [];
  for (const p of parts) if (!uniq.includes(p)) uniq.push(p);

  return uniq.slice(0, 20);
}

// --------------------
// Admin Auth
// --------------------
export async function adminLogin(formData: FormData) {
  const username = str(formData.get("username"));
  const password = str(formData.get("password"));
  const nextRaw = str(formData.get("next"));

  const okUser = safeEq(username, mustGetEnv("ADMIN_USERNAME"));
  const okPass = safeEq(password, mustGetEnv("ADMIN_PASSWORD"));

  if (!okUser || !okPass) {
    redirect(`/admin/login?error=${encodeURIComponent("Invalid admin credentials.")}`);
  }

  setAdminSession(username);
  redirect(safeNextPath(nextRaw, "/admin/teachers"));
}

export async function adminLogout() {
  requireAdmin("/admin/teachers");
  clearAdminSession();
  redirect("/admin/login?message=" + encodeURIComponent("Logged out."));
}

// --------------------
// Teachers (name + subjects[] + subject(primary))
// form fields: full_name, subjects (comma-separated)
// --------------------
export async function adminCreateTeacher(formData: FormData) {
  requireAdmin("/admin/teachers");

  const full_name = str(formData.get("full_name"));
  const subjectsCsv = str(formData.get("subjects"));

  if (!full_name) redirect(`/admin/teachers?error=${encodeURIComponent("Name is required.")}`);

  const subjects = parseSubjects(subjectsCsv);
  const primary = subjects[0] ?? null;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("teachers").insert({
    full_name,
    subject: primary, // keep for compatibility
    subjects,         // new
  });

  if (error) redirect(`/admin/teachers?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teachers");
  revalidatePath("/admin/teachers");
  redirect(`/admin/teachers?message=${encodeURIComponent("Teacher created.")}`);
}

export async function adminUpdateTeacher(formData: FormData) {
  requireAdmin("/admin/teachers");

  const id = str(formData.get("id"));
  const full_name = str(formData.get("full_name"));
  const subjectsCsv = str(formData.get("subjects"));

  if (!id) redirect(`/admin/teachers?error=${encodeURIComponent("Missing teacher id.")}`);
  if (!full_name)
    redirect(
      `/admin/teachers/${encodeURIComponent(id)}/edit?error=${encodeURIComponent("Name is required.")}`
    );

  const subjects = parseSubjects(subjectsCsv);
  const primary = subjects[0] ?? null;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("teachers")
    .update({
      full_name,
      subject: primary, // keep in sync
      subjects,
    })
    .eq("id", id);

  if (error)
    redirect(`/admin/teachers/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${id}`);
  revalidatePath("/admin/teachers");
  redirect(`/admin/teachers/${encodeURIComponent(id)}/edit?message=${encodeURIComponent("Saved.")}`);
}

export async function adminDeleteTeacher(formData: FormData) {
  requireAdmin("/admin/teachers");

  const id = str(formData.get("id"));
  if (!id) redirect(`/admin/teachers?error=${encodeURIComponent("Missing teacher id.")}`);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("teachers").delete().eq("id", id);

  if (error) {
    // typical: foreign key constraint from reviews.teacher_id
    redirect(`/admin/teachers?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/teachers");
  revalidatePath("/admin/teachers");
  redirect(`/admin/teachers?message=${encodeURIComponent("Teacher deleted.")}`);
}

// --------------------
// Reviews (edit/delete)
// --------------------
export async function adminUpdateReview(formData: FormData) {
  requireAdmin("/admin/reviews");

  const id = str(formData.get("id"));
  const teacher_id = str(formData.get("teacher_id"));

  const quality = Number(str(formData.get("quality")));
  const difficulty = Number(str(formData.get("difficulty")));
  const would_take_again = str(formData.get("would_take_again")) === "yes";
  const course = str(formData.get("course")) || null;
  const grade = str(formData.get("grade")) || null;
  const is_online = str(formData.get("is_online")) === "1";
  const comment = str(formData.get("comment")) || null;

  const tagsRaw = str(formData.get("tags"));
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((t) => t.toUpperCase())
    : [];

  if (!id) redirect(`/admin/reviews?error=${encodeURIComponent("Missing review id.")}`);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update({ quality, difficulty, would_take_again, course, grade, is_online, comment, tags })
    .eq("id", id);

  if (error) redirect(`/admin/reviews/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(error.message)}`);

  if (teacher_id) revalidatePath(`/teachers/${teacher_id}`);
  revalidatePath("/admin/reviews");
  redirect(`/admin/reviews/${encodeURIComponent(id)}/edit?message=${encodeURIComponent("Saved.")}`);
}

export async function adminDeleteReview(formData: FormData) {
  requireAdmin("/admin/reviews");

  const id = str(formData.get("id"));
  const teacher_id = str(formData.get("teacher_id"));
  if (!id) redirect(`/admin/reviews?error=${encodeURIComponent("Missing review id.")}`);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);

  if (teacher_id) revalidatePath(`/teachers/${teacher_id}`);
  revalidatePath("/admin/reviews");
  redirect(`/admin/reviews?message=${encodeURIComponent("Review deleted.")}`);
}

export async function adminResetAccountPassword(formData: FormData) {
  requireAdmin("/admin/accounts");

  const userId = str(formData.get("userId"));
  const accountLabel = str(formData.get("accountLabel"));
  const detailPath = userId ? `/admin/accounts/${encodeURIComponent(userId)}` : "/admin/accounts";

  if (!userId) redirect(`/admin/accounts?error=${encodeURIComponent("Missing account id.")}`);

  const supabase = createSupabaseAdminClient();
  const nextPassword = generateAdminAccountPassword();

  const userRes = await supabase.auth.admin.getUserById(userId);
  if (userRes.error || !userRes.data.user) {
    redirect(`/admin/accounts?error=${encodeURIComponent(userRes.error?.message ?? "Account not found.")}`);
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: nextPassword,
  });

  if (error) redirect(`${detailPath}?error=${encodeURIComponent(error.message)}`);

  try {
    await upsertAdminPasswordSnapshot({
      supabase,
      userId,
      username: accountLabel || userRes.data.user.email || userId,
      plaintextPassword: nextPassword,
      source: "admin_reset",
    });
  } catch (snapshotError) {
    const message = snapshotError instanceof Error ? snapshotError.message : "Failed to save password snapshot.";
    redirect(`${detailPath}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/accounts");
  revalidatePath(detailPath);
  redirect(`${detailPath}?message=${encodeURIComponent("Password reset.")}`);
}

// --------------------
// Tickets (status + threaded replies)
// --------------------
export async function adminDeleteTicket(formData: FormData) {
  requireAdmin("/admin/tickets");

  const id = str(formData.get("id"));
  if (!id) redirect(`/admin/tickets?error=${encodeURIComponent("Missing ticket id.")}`);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("support_tickets").delete().eq("id", id);

  if (error) redirect(`/admin/tickets?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/me/tickets");
  redirect(`/admin/tickets?message=${encodeURIComponent("Ticket deleted.")}`);
}

export async function adminUpdateTicket(formData: FormData) {
  requireAdmin("/admin/tickets");

  const id = str(formData.get("id"));
  const status = normalizeTicketStatus(formData.get("status"));
  const body = cleanTicketMessage(formData.get("body"), 2000);

  if (!id) redirect(`/admin/tickets?error=${encodeURIComponent("Missing ticket id.")}`);
  if (!status) {
    redirect(
      `/admin/tickets/${encodeURIComponent(id)}?error=${encodeURIComponent(
        "Status must be open, in progress, or closed."
      )}`
    );
  }

  const supabase = createSupabaseAdminClient();
  const ticketUpdate: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (body) ticketUpdate.admin_note = body;

  const { error } = await supabase.from("support_tickets").update(ticketUpdate).eq("id", id);

  if (error) redirect(`/admin/tickets/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`);

  if (body) {
    const { error: messageError } = await supabase.from("support_ticket_messages").insert({
      ticket_id: id,
      sender: "admin",
      body,
    });

    if (messageError) {
      redirect(`/admin/tickets/${encodeURIComponent(id)}?error=${encodeURIComponent(messageError.message)}`);
    }
  }

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath("/me/tickets");
  revalidatePath(`/me/tickets/${id}`);
  redirect(`/admin/tickets/${encodeURIComponent(id)}?message=${encodeURIComponent("Updated.")}`);
}
