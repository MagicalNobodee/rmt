"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildLoginFingerprint } from "./adminAccountView.mjs";
import { upsertAdminPasswordSnapshot } from "./adminPasswordStore.mjs";
import { createSupabaseAdminClient } from "./supabaseAdmin";
import { createSupabaseServerClient } from "./supabase";
import { isValidPublicUsername, publicUsernameToInternalEmail } from "./publicUserAuth.mjs";
import { cleanTicketMessage, isClosedTicketStatus } from "./ticketWorkflow.mjs";
import {
  hasPublicSignupLock,
  requirePublicUserOrRedirect,
  safeRedirectPath,
  setPublicSignupLock,
} from "./publicUserSession";

function str(v: FormDataEntryValue | null | undefined): string {
  return String(v ?? "").trim();
}

function getLast(formData: FormData, key: string): string {
  const all = formData.getAll(key);
  if (!all.length) return "";
  return str(all[all.length - 1]);
}

function num(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function intInRange(v: string, min: number, max: number): number | null {
  const n = num(v);
  if (n === null) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

function bool01(v: string): boolean {
  return v === "1" || v.toLowerCase() === "true";
}

function teacherPage(teacherId: string) {
  return `/teachers/${encodeURIComponent(teacherId)}`;
}

function teacherRatePage(teacherId: string) {
  return `/teachers/${encodeURIComponent(teacherId)}/rate`;
}

function myTicketPage(ticketId: string) {
  return `/me/tickets/${encodeURIComponent(ticketId)}`;
}

function getSubjectOrCourse(formData: FormData): { value: string; source: "subject" | "course" | "none" } {
  const subject = str(formData.get("subject"));
  if (subject) return { value: subject, source: "subject" };

  const course = str(formData.get("course"));
  if (course) return { value: course, source: "course" };

  return { value: "", source: "none" };
}

function validatePassword(password: string) {
  return password.length >= 8;
}

async function recordPublicUserLoginEvent(userId: string, eventType: "signin" | "signup") {
  if (!userId) return;

  try {
    const fingerprint = buildLoginFingerprint(headers(), process.env.ADMIN_COOKIE_SECRET ?? "");
    const supabaseAdmin = createSupabaseAdminClient();
    await supabaseAdmin.from("public_user_login_events").insert({
      user_id: userId,
      event_type: eventType,
      ip_address: fingerprint.ipAddress,
      user_agent: fingerprint.userAgent,
      accept_language: fingerprint.acceptLanguage,
      fingerprint_hash: fingerprint.fingerprintHash || null,
    });
  } catch {
    // Login history should never block authentication.
  }
}

export async function signInWithUsernameAndPassword(formData: FormData) {
  const username = str(formData.get("username"));
  const password = str(formData.get("password"));
  const redirectTo = safeRedirectPath(str(formData.get("redirectTo")), "/teachers");

  if (!username || !password) {
    redirect(
      `/login?error=${encodeURIComponent("Username and password are required.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  if (!isValidPublicUsername(username)) {
    redirect(
      `/login?error=${encodeURIComponent("Username must use lowercase letters, numbers, ., _, or -.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: publicUsernameToInternalEmail(username),
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent("Invalid username or password.")}&redirectTo=${encodeURIComponent(redirectTo)}`
    );
  }

  if (data.user?.id) await recordPublicUserLoginEvent(data.user.id, "signin");

  redirect(redirectTo);
}

export async function signUpWithUsernameAndPassword(formData: FormData) {
  const username = str(formData.get("username"));
  const password = str(formData.get("password"));
  const confirmPassword = str(formData.get("confirmPassword"));
  const redirectTo = safeRedirectPath(str(formData.get("redirectTo")), "/teachers");

  if (hasPublicSignupLock()) {
    redirect(
      `/login?mode=signin&error=${encodeURIComponent("This browser has already created an account. Please sign in.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  if (!isValidPublicUsername(username)) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(
        "Username must be 3-24 chars using lowercase letters, numbers, ., _, or -."
      )}&redirectTo=${encodeURIComponent(redirectTo)}`
    );
  }

  if (!password) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("Password is required.")}&redirectTo=${encodeURIComponent(redirectTo)}`
    );
  }

  if (!validatePassword(password)) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("Password must be at least 8 characters.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("Passwords do not match.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const email = publicUsernameToInternalEmail(username);
  const { data: createdUserResult, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      kind: "public_user",
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "Username is already taken."
      : "Failed to create account.";
    redirect(`/login?mode=signup&error=${encodeURIComponent(message)}&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  try {
    await upsertAdminPasswordSnapshot({
      supabase: supabaseAdmin,
      userId: createdUserResult.user?.id,
      username,
      plaintextPassword: password,
      source: "signup",
    });
  } catch {
    if (createdUserResult.user?.id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdUserResult.user.id);
      } catch {
        // best effort cleanup
      }
    }

    redirect(
      `/login?mode=signup&error=${encodeURIComponent("Failed to save the account password snapshot.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  setPublicSignupLock(username);
  if (createdUserResult.user?.id) await recordPublicUserLoginEvent(createdUserResult.user.id, "signup");

  const supabase = createSupabaseServerClient();
  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (signInResult.error) {
    redirect(
      `/login?mode=signin&message=${encodeURIComponent("Account created. Please sign in.")}&redirectTo=${encodeURIComponent(
        redirectTo
      )}`
    );
  }

  redirect(redirectTo);
}

export async function signOutPublicUser() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/teachers");
}

export async function createReview(formData: FormData) {
  const teacherId = str(formData.get("teacherId"));
  const quality = intInRange(str(formData.get("quality")), 1, 5);
  const difficulty = intInRange(str(formData.get("difficulty")), 1, 5);

  const wouldTakeAgainRaw = str(formData.get("wouldTakeAgain")).toLowerCase();
  const wouldTakeAgain = wouldTakeAgainRaw === "yes" ? true : wouldTakeAgainRaw === "no" ? false : null;

  const subjectOrCourse = getSubjectOrCourse(formData);
  const courseValue = subjectOrCourse.value;
  const grade = str(formData.get("grade"));

  const hasIsOnline = formData.has("isOnline");
  const isOnline = hasIsOnline ? bool01(getLast(formData, "isOnline")) : false;

  const comment = str(formData.get("comment"));
  const requireCourse = bool01(str(formData.get("requireCourse"))) || bool01(str(formData.get("requireSubject")));
  const requireComment = bool01(str(formData.get("requireComment")));
  const maxTags = Math.min(10, Math.max(0, Math.trunc(num(str(formData.get("maxTags"))) ?? 10)));
  const commentLimit = Math.min(1200, Math.max(50, Math.trunc(num(str(formData.get("commentLimit"))) ?? 1200)));

  const tagsRaw = str(formData.get("tags"));
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, maxTags)
        .map((t) => t.toUpperCase())
    : [];

  if (!teacherId) redirect(`/teachers?error=${encodeURIComponent("Missing teacher id.")}`);
  if (quality === null) redirect(`${teacherRatePage(teacherId)}?error=${encodeURIComponent("Quality must be 1-5.")}`);
  if (difficulty === null) {
    redirect(`${teacherRatePage(teacherId)}?error=${encodeURIComponent("Difficulty must be 1-5.")}`);
  }
  if (requireCourse && !courseValue) {
    redirect(`${teacherRatePage(teacherId)}?error=${encodeURIComponent("Subject is required.")}`);
  }
  if (requireComment && !comment) {
    redirect(`${teacherRatePage(teacherId)}?error=${encodeURIComponent("Review text is required.")}`);
  }
  if (comment.length > commentLimit) {
    redirect(
      `${teacherRatePage(teacherId)}?error=${encodeURIComponent(`Review is too long (max ${commentLimit} characters).`)}`
    );
  }

  const { user } = await requirePublicUserOrRedirect(teacherRatePage(teacherId));
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("user_id", user.id)
    .limit(1);

  if ((existing ?? []).length > 0) {
    redirect(`${teacherPage(teacherId)}?error=${encodeURIComponent("You already rated this teacher.")}`);
  }

  const { error } = await supabase.from("reviews").insert({
    teacher_id: teacherId,
    user_id: user.id,
    quality,
    difficulty,
    would_take_again: wouldTakeAgain ?? true,
    comment: comment || null,
    tags,
    course: courseValue || null,
    grade: grade || null,
    is_online: isOnline,
  });

  if (error) {
    redirect(`${teacherRatePage(teacherId)}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(teacherPage(teacherId));
  revalidatePath("/me/ratings");
  redirect(`${teacherPage(teacherId)}#ratings`);
}

export async function updateMyReview(formData: FormData) {
  const reviewId = str(formData.get("reviewId"));
  if (!reviewId) redirect(`/me/ratings?error=${encodeURIComponent("Missing review id.")}`);

  const quality = intInRange(str(formData.get("quality")), 1, 5);
  const difficulty = intInRange(str(formData.get("difficulty")), 1, 5);
  const wouldTakeAgain = str(formData.get("wouldTakeAgain")).toLowerCase();
  const { value: courseValue } = getSubjectOrCourse(formData);
  const grade = str(formData.get("grade"));
  const hasIsOnline = formData.has("isOnline");
  const isOnline = hasIsOnline ? bool01(getLast(formData, "isOnline")) : undefined;
  const comment = str(formData.get("comment"));

  const tagsRaw = str(formData.get("tags"));
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((t) => t.toUpperCase())
    : [];

  const editPath = `/me/ratings/${encodeURIComponent(reviewId)}/edit`;

  if (quality === null) redirect(`${editPath}?error=${encodeURIComponent("Quality must be 1-5.")}`);
  if (difficulty === null) redirect(`${editPath}?error=${encodeURIComponent("Difficulty must be 1-5.")}`);
  if (wouldTakeAgain !== "yes" && wouldTakeAgain !== "no") {
    redirect(`${editPath}?error=${encodeURIComponent("Would take again is required.")}`);
  }
  if (!courseValue) {
    redirect(`${editPath}?error=${encodeURIComponent("Course code is required.")}`);
  }
  if (comment.length > 1200) {
    redirect(`${editPath}?error=${encodeURIComponent("Comment is too long (max 1200).")}`);
  }

  const { user } = await requirePublicUserOrRedirect(editPath);
  const supabase = createSupabaseAdminClient();

  const updatePayload: Record<string, unknown> = {
    quality,
    difficulty,
    would_take_again: wouldTakeAgain === "yes",
    course: courseValue || null,
    grade: grade || null,
    tags,
    comment: comment || null,
  };

  if (hasIsOnline) updatePayload.is_online = isOnline;

  const { data: updated, error } = await supabase
    .from("reviews")
    .update(updatePayload)
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .select("teacher_id")
    .maybeSingle();

  if (error || !updated) {
    redirect(`${editPath}?error=${encodeURIComponent(error?.message ?? "Update failed.")}`);
  }

  revalidatePath("/me/ratings");
  revalidatePath(teacherPage(updated.teacher_id));
  redirect(`/me/ratings?message=${encodeURIComponent("Rating updated.")}`);
}

export async function deleteMyReview(formData: FormData) {
  const reviewId = str(formData.get("reviewId"));
  if (!reviewId) redirect(`/me/ratings?error=${encodeURIComponent("Missing review id.")}`);

  const { user } = await requirePublicUserOrRedirect("/me/ratings");
  const supabase = createSupabaseAdminClient();

  const { data: deleted, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .select("teacher_id")
    .maybeSingle();

  if (error || !deleted) {
    redirect(`/me/ratings?error=${encodeURIComponent(error?.message ?? "Delete failed.")}`);
  }

  revalidatePath("/me/ratings");
  revalidatePath(teacherPage(deleted.teacher_id));
  redirect(`/me/ratings?message=${encodeURIComponent("Rating deleted.")}`);
}

export async function addMyTicketMessage(formData: FormData) {
  const ticketId = str(formData.get("ticketId"));
  const detailPath = ticketId ? myTicketPage(ticketId) : "/me/tickets";
  const body = cleanTicketMessage(formData.get("body"), 2000);

  if (!ticketId) redirect(`/me/tickets?error=${encodeURIComponent("Missing ticket id.")}`);
  if (!body) redirect(`${detailPath}?error=${encodeURIComponent("Message is required.")}`);

  const { user } = await requirePublicUserOrRedirect(detailPath);
  const supabase = createSupabaseAdminClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ticketError || !ticket) {
    redirect(`/me/tickets?error=${encodeURIComponent(ticketError?.message ?? "Ticket not found.")}`);
  }

  if (isClosedTicketStatus(ticket.status)) {
    redirect(`${detailPath}?error=${encodeURIComponent("This ticket is closed and cannot receive new messages.")}`);
  }

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender: "user",
    body,
  });

  if (error) redirect(`${detailPath}?error=${encodeURIComponent(error.message)}`);

  await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId).eq("user_id", user.id);

  revalidatePath("/me/tickets");
  revalidatePath(detailPath);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  redirect(`${detailPath}?message=${encodeURIComponent("Message sent.")}`);
}

export async function deleteMyTicket(ticketId: string) {
  const id = String(ticketId ?? "").trim();
  if (!id) return { ok: false, error: "Missing ticket id." };

  const { user } = await requirePublicUserOrRedirect("/me/tickets");
  const supabase = createSupabaseAdminClient();

  const { data: deleted, error } = await supabase
    .from("support_tickets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { ok: false, error: error?.message ?? "Delete failed." };
  }

  revalidatePath("/me/tickets");
  revalidatePath("/admin/tickets");
  return { ok: true, message: "Ticket deleted." };
}

export async function setReviewVote(formData: FormData) {
  const teacherId = str(formData.get("teacherId"));
  const reviewId = str(formData.get("reviewId"));
  const op = str(formData.get("op")) as "up" | "down" | "clear";

  if (!teacherId || !reviewId) throw new Error("Missing teacherId or reviewId.");
  if (op !== "up" && op !== "down" && op !== "clear") throw new Error("Invalid vote operation.");

  const { user } = await requirePublicUserOrRedirect(teacherPage(teacherId));
  const supabase = createSupabaseAdminClient();

  if (op === "clear") {
    const { error } = await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    revalidatePath(teacherPage(teacherId));
    return { ok: true };
  }

  const vote = op === "up" ? 1 : -1;
  const { error } = await supabase
    .from("review_votes")
    .upsert({ review_id: reviewId, user_id: user.id, vote }, { onConflict: "review_id,user_id" });

  if (error) throw new Error(error.message);

  revalidatePath(teacherPage(teacherId));
  return { ok: true };
}
