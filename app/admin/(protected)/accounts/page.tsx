import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import SubmitButton from "@/components/SubmitButton";
import { toAdminAccountView } from "@/lib/adminAccountView.mjs";
import { INTERNAL_AUTH_EMAIL_DOMAIN, publicUsernameFromUser } from "@/lib/publicUserAuth.mjs";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type SearchParams = {
  q?: string;
};

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

function userMetadata(user: User) {
  return (user.user_metadata ?? {}) as Record<string, unknown>;
}

function isPublicAccount(user: User) {
  const metadata = userMetadata(user);
  const hasPublicKind = metadata.kind === "public_user";
  const hasPublicEmail = Boolean(user.email?.endsWith(`@${INTERNAL_AUTH_EMAIL_DOMAIN}`));
  return hasPublicKind || hasPublicEmail || Boolean(publicUsernameFromUser(user));
}

function matchesQuery(user: User, q: string) {
  if (!q) return true;

  const username = publicUsernameFromUser(user);
  const haystack = [username, user.email, user.id, safeJson(user.user_metadata), safeJson(user.app_metadata)]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q.toLowerCase());
}

function groupByUserId<T extends { user_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const current = map.get(row.user_id) ?? [];
    current.push(row);
    map.set(row.user_id, current);
  }
  return map;
}

async function listAllAuthUsers(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { users, error };

    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  return { users, error: null };
}

export default async function AdminAccountsPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = createSupabaseAdminClient();
  const q = (searchParams?.q ?? "").trim();

  const { users: authUsers, error: authError } = await listAllAuthUsers(supabase);
  const publicUsers = authUsers.filter(isPublicAccount).filter((user) => matchesQuery(user, q));
  const userIds = publicUsers.map((user) => user.id).filter(Boolean);

  let reviews: AccountReview[] = [];
  let reviewsError: { message: string } | null = null;
  let loginEvents: LoginEventRow[] = [];
  let loginEventsError: { message: string } | null = null;

  if (userIds.length > 0) {
    const reviewsResult = await supabase
      .from("reviews")
      .select(
        "id, created_at, teacher_id, user_id, quality, difficulty, would_take_again, comment, course, grade, is_online, teacher:teachers(full_name, subject)"
      )
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    reviews = (reviewsResult.data ?? []) as unknown as AccountReview[];
    reviewsError = reviewsResult.error;

    const eventsResult = await supabase
      .from("public_user_login_events")
      .select("id, user_id, event_type, ip_address, user_agent, accept_language, fingerprint_hash, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    loginEvents = (eventsResult.data ?? []) as unknown as LoginEventRow[];
    loginEventsError = eventsResult.error;
  }

  const reviewsByUserId = groupByUserId(reviews);
  const loginEventsByUserId = groupByUserId(loginEvents);
  const accountViews = publicUsers.map((user) => ({
    user,
    view: toAdminAccountView(user, {
      reviewCount: reviewsByUserId.get(user.id)?.length ?? 0,
      loginEvents: loginEventsByUserId.get(user.id) ?? [],
    }),
    reviews: reviewsByUserId.get(user.id) ?? [],
  }));

  const totalReviews = reviews.length;
  const accountsWithFingerprints = accountViews.filter(({ view }) => view.login.events.length > 0).length;

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-neutral-500">Admin</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Account Management</h1>
            <div className="mt-1 text-sm text-neutral-600">
              View registered accounts, available auth metadata, login fingerprints, and each user&apos;s reviews.
            </div>
          </div>

          <Link
            href="/admin/reviews"
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            Review manager
          </Link>
        </div>

        {authError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Failed to load auth users: {authError.message}
          </div>
        ) : null}
        {reviewsError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Failed to load reviews: {reviewsError.message}
          </div>
        ) : null}
        {loginEventsError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Login fingerprint history is unavailable: {loginEventsError.message}. Apply the latest Supabase migration to
            start recording new sign-ins.
          </div>
        ) : null}

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-semibold text-neutral-600">Search accounts</div>
            <input
              name="q"
              defaultValue={q}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="username, internal email, user id, metadata..."
            />
          </div>
          <div className="flex items-end gap-2">
            <SubmitButton
              pendingText="Applying..."
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Apply
            </SubmitButton>
            {q ? (
              <Link href="/admin/accounts" className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50">
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-neutral-50 p-4">
            <div className="text-xs font-semibold text-neutral-500">Registered accounts</div>
            <div className="mt-1 text-2xl font-extrabold">{accountViews.length}</div>
          </div>
          <div className="rounded-2xl border bg-neutral-50 p-4">
            <div className="text-xs font-semibold text-neutral-500">Reviews shown</div>
            <div className="mt-1 text-2xl font-extrabold">{totalReviews}</div>
          </div>
          <div className="rounded-2xl border bg-neutral-50 p-4">
            <div className="text-xs font-semibold text-neutral-500">Accounts with fingerprints</div>
            <div className="mt-1 text-2xl font-extrabold">{accountsWithFingerprints}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {accountViews.map(({ user, view, reviews: accountReviews }) => (
          <section key={view.id} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-500">Account</div>
                <h2 className="mt-1 break-all text-xl font-extrabold tracking-tight">{view.username}</h2>
                <div className="mt-1 break-all text-sm text-neutral-600">
                  User ID: <span className="font-mono">{view.id}</span>
                </div>
              </div>

              <div className="rounded-xl border bg-neutral-50 px-4 py-3 text-right">
                <div className="text-xs font-semibold text-neutral-500">Reviews</div>
                <div className="mt-1 text-2xl font-extrabold">{view.reviewCount}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-sm font-extrabold">Username & Password</div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Username</dt>
                    <dd className="mt-0.5 break-all font-mono">{view.username}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Internal email</dt>
                    <dd className="mt-0.5 break-all font-mono">{view.internalEmail || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Password</dt>
                    <dd className="mt-0.5 text-neutral-800">{view.password.label}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-sm font-extrabold">Auth Status</div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Created</dt>
                    <dd className="mt-0.5">{formatDateTime(view.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Last sign in</dt>
                    <dd className="mt-0.5">{formatDateTime(view.lastSignInAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Email confirmed</dt>
                    <dd className="mt-0.5">{formatDateTime(view.emailConfirmedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-neutral-500">Role / Aud</dt>
                    <dd className="mt-0.5">
                      {view.role || "—"} <span className="text-neutral-300">/</span> {view.aud || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
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
                      <dt className="text-xs font-semibold text-neutral-500">User agent</dt>
                      <dd className="mt-0.5 break-all">{view.login.latest.userAgent || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-neutral-500">Fingerprint hash</dt>
                      <dd className="mt-0.5 break-all font-mono">{view.login.latest.fingerprintHash || "—"}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="mt-3 text-sm text-neutral-600">
                    No recorded login fingerprint yet. New sign-ins are recorded after the migration is applied.
                  </div>
                )}
              </div>
            </div>

            <details className="mt-4 rounded-2xl border bg-white p-4">
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
                <div className="lg:col-span-2">
                  <div className="text-xs font-semibold text-neutral-500">Raw auth user</div>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-50">
                    {safeJson(user)}
                  </pre>
                </div>
              </div>
            </details>

            <div className="mt-4 rounded-2xl border bg-white">
              <div className="border-b px-4 py-3 text-sm font-extrabold">Login Fingerprint History</div>
              <div className="divide-y">
                {view.login.events.length > 0 ? (
                  view.login.events.map((event: ReturnType<typeof toAdminAccountView>["login"]["events"][number]) => (
                    <div key={`${event.createdAt}-${event.fingerprintHash}`} className="px-4 py-3 text-sm">
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
                  <div className="px-4 py-6 text-sm text-neutral-600">No fingerprint events.</div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div className="text-sm font-extrabold">Posted Reviews</div>
                <Link href={`/admin/reviews?q=&teacher=`} className="text-sm font-semibold text-neutral-600 hover:underline">
                  Open all reviews
                </Link>
              </div>
              <div className="divide-y">
                {accountReviews.length > 0 ? (
                  accountReviews.map((review) => {
                    const teacher = getTeacher(review);
                    return (
                      <div key={review.id} className="px-4 py-4">
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
                              {review.grade ? (
                                <>
                                  <span className="mx-2 text-neutral-300">·</span>
                                  Grade: {review.grade}
                                </>
                              ) : null}
                              {review.is_online ? (
                                <>
                                  <span className="mx-2 text-neutral-300">·</span>
                                  Online
                                </>
                              ) : null}
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
                  <div className="px-4 py-6 text-sm text-neutral-600">No reviews from this account.</div>
                )}
              </div>
            </div>
          </section>
        ))}

        {accountViews.length === 0 ? (
          <div className="rounded-2xl border bg-white px-6 py-10 text-sm text-neutral-600 shadow-sm">
            No public accounts found.
          </div>
        ) : null}
      </div>
    </div>
  );
}
