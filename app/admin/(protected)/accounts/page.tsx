import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import SubmitButton from "@/components/SubmitButton";
import { toAdminAccountView } from "@/lib/adminAccountView.mjs";
import { INTERNAL_AUTH_EMAIL_DOMAIN, publicUsernameFromUser } from "@/lib/publicUserAuth.mjs";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type SearchParams = {
  q?: string;
};

type LoginEventRow = {
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  accept_language: string | null;
  fingerprint_hash: string | null;
  created_at: string;
};

type ReviewCountRow = {
  user_id: string;
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

function userMetadata(user: User) {
  return (user.user_metadata ?? {}) as Record<string, unknown>;
}

function isManagedAccount(user: User) {
  const metadata = userMetadata(user);
  const hasPublicKind = metadata.kind === "public_user";
  const hasSyntheticUsername = Boolean(publicUsernameFromUser(user));
  const hasLegacyEmail = Boolean(user.email && !user.email.endsWith(`@${INTERNAL_AUTH_EMAIL_DOMAIN}`));
  return hasPublicKind || hasSyntheticUsername || hasLegacyEmail;
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
  for (const row of rows ?? []) {
    if (!row?.user_id) continue;
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
  const managedUsers = authUsers.filter(isManagedAccount).filter((user) => matchesQuery(user, q));
  const userIds = managedUsers.map((user) => user.id).filter(Boolean);

  let reviewRows: ReviewCountRow[] = [];
  let reviewsError: { message: string } | null = null;
  let loginEvents: LoginEventRow[] = [];
  let loginEventsError: { message: string } | null = null;

  if (userIds.length > 0) {
    const reviewsResult = await supabase.from("reviews").select("user_id").in("user_id", userIds);
    reviewRows = (reviewsResult.data ?? []) as unknown as ReviewCountRow[];
    reviewsError = reviewsResult.error;

    const eventsResult = await supabase
      .from("public_user_login_events")
      .select("user_id, event_type, ip_address, user_agent, accept_language, fingerprint_hash, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    loginEvents = (eventsResult.data ?? []) as unknown as LoginEventRow[];
    loginEventsError = eventsResult.error;
  }

  const reviewsByUserId = groupByUserId(reviewRows);
  const loginEventsByUserId = groupByUserId(loginEvents);
  const accountViews = managedUsers
    .map((user) =>
      toAdminAccountView(user, {
        reviewCount: reviewsByUserId.get(user.id)?.length ?? 0,
        loginEvents: loginEventsByUserId.get(user.id) ?? [],
      })
    )
    .sort((a, b) => {
      const aTime = Date.parse(a.latestLoginAt ?? "") || 0;
      const bTime = Date.parse(b.latestLoginAt ?? "") || 0;
      return bTime - aTime || a.displayLabel.localeCompare(b.displayLabel);
    });

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-neutral-500">Admin</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Account Management</h1>
            <div className="mt-1 text-sm text-neutral-600">
              Browse registered accounts, including current username accounts and older email-based accounts.
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
            Failed to load review counts: {reviewsError.message}
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
              placeholder="username, email, user id, metadata..."
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
      </div>

      <div className="mt-4 rounded-2xl border bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1.6fr)_190px_100px_110px] gap-4 border-b px-6 py-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <div>Account</div>
          <div>Latest login</div>
          <div>Reviews</div>
          <div />
        </div>

        <div className="divide-y">
          {accountViews.map((view) => (
            <div
              key={view.id}
              className="grid grid-cols-[minmax(0,1.6fr)_190px_100px_110px] items-center gap-4 px-6 py-4"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold">{view.displayLabel}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  {view.accountType === "legacy_email" ? "Legacy email account" : "Username account"}
                </div>
              </div>
              <div className="text-sm text-neutral-700">{formatDateTime(view.latestLoginAt)}</div>
              <div className="text-sm font-semibold text-neutral-900">{view.reviewCount}</div>
              <div className="flex justify-end">
                <Link
                  href={`/admin/accounts/${encodeURIComponent(view.id)}`}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}

          {accountViews.length === 0 ? (
            <div className="px-6 py-10 text-sm text-neutral-600">No managed accounts found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
