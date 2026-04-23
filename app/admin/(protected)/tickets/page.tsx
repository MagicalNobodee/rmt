// app/admin/(protected)/tickets/page.tsx
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { publicContactEmailToUsername } from "@/lib/publicUserAuth.mjs";

function statusLabel(s: string) {
  switch (s) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return s || "—";
  }
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();

  const q = (searchParams?.q ?? "").trim();
  const status = (searchParams?.status ?? "").trim();

  let qb = supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, email, category, category_other, title, status")
    .order("created_at", { ascending: false })
    .limit(80);

  if (status) qb = qb.eq("status", status);
  if (q) qb = qb.or(`email.ilike.%${q}%,title.ilike.%${q}%`);

  const { data: rows, error } = await qb;

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold text-neutral-500">Admin</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Tickets</h1>
        <div className="mt-1 text-sm text-neutral-600">View tickets, change status, and reply via admin_note.</div>

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
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Failed: {error.message}
          </div>
        ) : null}

        <form className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-neutral-600">Search (username/title)</div>
            <input
              name="q"
              defaultValue={q}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="keyword..."
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-600">Status</div>
            <select
              name="status"
              defaultValue={status}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4 text-sm font-semibold">Latest tickets</div>
        <div className="divide-y">
          {(rows ?? []).map((t) => {
            const category =
              t.category === "Other" && t.category_other ? `Other: ${t.category_other}` : t.category;

            return (
              <div key={t.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold">{t.title}</div>
                    <div className="mt-1 text-xs text-neutral-600">
                      Username:
                      <span className="ml-1 font-mono">{publicContactEmailToUsername(t.email) || "—"}</span>
                      <span className="mx-2 text-neutral-300">·</span>
                      {category}
                      <span className="mx-2 text-neutral-300">·</span>
                      {statusLabel(t.status)}
                    </div>
                  </div>

                  <Link
                    href={`/admin/tickets/${encodeURIComponent(t.id)}`}
                    className="shrink-0 rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}

          {(rows ?? []).length === 0 ? <div className="px-6 py-10 text-sm text-neutral-600">No tickets.</div> : null}
        </div>
      </div>
    </div>
  );
}
