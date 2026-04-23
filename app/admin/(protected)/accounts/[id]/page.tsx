import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { toAdminAccountView } from "@/lib/adminAccountView.mjs";
import { getAdminPasswordSnapshotByUserId } from "@/lib/adminPasswordStore.mjs";
import { adminResetAccountPassword } from "@/lib/admin/actions";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AccountReview = {
  id: string;
  created_at: string;
  teacher_id: string;
  user_id: string;
  quality: number;
  difficulty: number;
  would_take_again: boolean;
  comment: string | null;
  course: string | null;
  grade: string | null;
  is_online: boolean | null;
  teacher?: { full_name?: string | null; subject?: string | null } | { full_name?: string | null; subject?: string | null }[] | null;
};

type LoginEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  accept_language: string | null;
  fingerprint_hash: string | null;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function getTeacher(review: AccountReview) {
  return Array.isArray(review.teacher) ? review.teacher[0] : review.teacher;
}

export default async function AdminAccountDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const userRes = await supabase.auth.admin.getUserById(params.id);
  const user = userRes.data.user;

  if (userRes.error || !user) notFound();

  const [{ data: reviewRows, error: reviewsError }, { data: loginEventRows, error: loginEventsError }] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, created_at, teacher_id, user_id, quality, difficulty, would_take_again, comment, course, grade, is_online, teacher:teachers(full_name, subject)"
      )
      .eq("user_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("public_user_login_events")
      .select("id, user_id, event_type, ip_address, user_agent, accept_language, fingerprint_hash, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  let passwordSnapshot = null;
  let passwordError = "";
  try {
    passwordSnapshot = await getAdminPasswordSnapshotByUserId({ supabase, userId: params.id });
  } catch (error) {
    passwordError = error instanceof Error ? error.message : "Failed to load password snapshot.";
  }

  const reviews = (reviewRows ?? []) as unknown as AccountReview[];
  const loginEvents = (loginEventRows ?? []) as unknown as LoginEventRow[];
  const view = toAdminAccountView(user, {
    reviewCount: reviews.length,
    loginEvents,
    passwordSnapshot,
  });

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-neutral-500">Accounts</div>
            <h1 className="mt-1 break-all text-2xl font-extrabold tracking-tight">{view.displayLabel}</h1>
            <div className="mt-1 text-sm text-neutral-600">
              {view.accountType === "legacy_email" ? "Legacy email account" : "Username account"}
              <span className="mx-2 text-neutral-300">·</span>
              Latest login: {formatDateTime(view.latestLoginAt)}
            </div>
          </div>

          <Link
            href="/admin/accounts"
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            ← Back to accounts
          </Link>
        </div>

        {searchParams?.error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {searchParams.error}
          </div>
        ) : null}
        {searchParams?.message ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {searchParams.message}
          </div>
        ) : null}
        {reviewsError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Failed to load reviews: {reviewsError.message}
          </div>
        ) : null}
        {loginEventsError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Failed to load login fingerprints: {loginEventsError.message}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold">Password</div>
          {passwordError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {passwordError}
            </div>
          ) : view.password.rawAvailable ? (
            <>
              <div className="mt-3 break-all rounded-xl bg-neutral-950 px-4 py-3 font-mono text-sm text-neutral-50">
                {view.password.value}
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                Source: {view.password.source}
                <span className="mx-2 text-neutral-300">·</span>
                Updated: {formatDateTime(view.password.updatedAt)}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-neutral-600">{view.password.label}</div>
          )}

          <form action={adminResetAccountPassword} className="mt-4">
            <input type="hidden" name="userId" value={view.id} />
            <input type="hidden" name="accountLabel" value={view.displayLabel} />
            <SubmitButton
              pendingText="Resetting..."
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Reset Password
            </SubmitButton>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold">Account Info</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold text-neutral-500">Username</dt>
              <dd className="mt-0.5 break-all font-mono">{view.username || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-neutral-500">Internal email</dt>
              <dd className="mt-0.5 break-all font-mono">{view.internalEmail || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-neutral-500">Created</dt>
              <dd className="mt-0.5">{formatDateTime(view.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-neutral-500">Email confirmed</dt>
              <dd className="mt-0.5">{formatDateTime(view.emailConfirmedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-neutral-500">Reviews</dt>
              <dd className="mt-0.5">{view.reviewCount}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold">Latest Login Fingerprint</div>
          {view.login.latest ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold text-neutral-500">Time / Event</dt>
                <dd className="mt-0.5">
                  {formatDateTime(view.login.latest.createdAt)} · {view.login.latest.eventType}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-neutral-500">IP</dt>
                <dd className="mt-0.5 break-all font-mono">{view.login.latest.ipAddress || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-neutral-500">Fingerprint hash</dt>
                <dd className="mt-0.5 break-all font-mono">{view.login.latest.fingerprintHash || "—"}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3 text-sm text-neutral-600">No recorded login fingerprint yet.</div>
          )}
        </div>
      </div>

      <details className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
        <summary className="cursor-pointer text-sm font-extrabold">All Auth Metadata</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-neutral-500">user_metadata</div>
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
              {safeJson(view.userMetadata)}
            </pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-500">app_metadata</div>
            <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
              {safeJson(view.appMetadata)}
            </pre>
          </div>
        </div>
      </details>

      <div className="mt-4 rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4 text-sm font-extrabold">Login Fingerprint History</div>
        <div className="divide-y">
          {view.login.events.length > 0 ? (
            view.login.events.map((event: ReturnType<typeof toAdminAccountView>["login"]["events"][number]) => (
              <div key={`${event.createdAt}-${event.fingerprintHash}`} className="px-6 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">
                    {formatDateTime(event.createdAt)} · {event.eventType}
                  </div>
                  <div className="break-all font-mono text-xs text-neutral-500">{event.fingerprintHash || "No hash"}</div>
                </div>
                <div className="mt-1 break-all text-xs text-neutral-600">
                  IP: <span className="font-mono">{event.ipAddress || "—"}</span>
                  <span className="mx-2 text-neutral-300">·</span>
                  Language: {event.acceptLanguage || "—"}
                </div>
                <div className="mt-1 break-all text-xs text-neutral-600">UA: {event.userAgent || "—"}</div>
              </div>
            ))
          ) : (
            <div className="px-6 py-10 text-sm text-neutral-600">No fingerprint events.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4 text-sm font-extrabold">Posted Reviews</div>
        <div className="divide-y">
          {reviews.length > 0 ? (
            reviews.map((review) => {
              const teacher = getTeacher(review);
              return (
                <div key={review.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">
                        {teacher?.full_name || "Unknown Teacher"}
                        <span className="mx-2 text-neutral-300">·</span>
                        <span className="text-xs font-semibold text-neutral-600">{teacher?.subject || "—"}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {formatDateTime(review.created_at)}
                        <span className="mx-2 text-neutral-300">·</span>
                        Q{review.quality} / D{review.difficulty}
                        <span className="mx-2 text-neutral-300">·</span>
                        Would take again: {review.would_take_again ? "Yes" : "No"}
                        <span className="mx-2 text-neutral-300">·</span>
                        Course/Subject: {review.course || "—"}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
                        {review.comment || <span className="text-neutral-400">No comment.</span>}
                      </div>
                    </div>

                    <Link
                      href={`/admin/reviews/${encodeURIComponent(review.id)}/edit`}
                      className="shrink-0 rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-10 text-sm text-neutral-600">No reviews from this account.</div>
          )}
        </div>
      </div>
    </div>
  );
}
