// app/admin/(protected)/tickets/page.tsx
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { publicContactEmailToUsername } from "@/lib/publicUserAuth.mjs";
import { getLatestTicketMessageByTicketId, normalizeTicketStatus, ticketStatusLabel } from "@/lib/ticketWorkflow.mjs";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();

  const q = (searchParams?.q ?? "").trim();
  const status = normalizeTicketStatus(searchParams?.status) ?? "";

  let qb = supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, email, category, category_other, title, status, admin_note")
    .order("updated_at", { ascending: false })
    .limit(80);

  if (status) qb = qb.eq("status", status);
  if (q) qb = qb.or(`email.ilike.%${q}%,title.ilike.%${q}%`);

  const { data: rows, error } = await qb;
  const ticketIds = (rows ?? []).map((ticket) => ticket.id);
  const { data: messageRows } = ticketIds.length
    ? await supabase
        .from("support_ticket_messages")
        .select("ticket_id, sender, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const latestMessageByTicketId = getLatestTicketMessageByTicketId(messageRows ?? []);

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold text-neutral-500">Admin</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Tickets</h1>
        <div className="mt-1 text-sm text-neutral-600">View tickets, change status, and continue threaded replies.</div>

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
            const latestMessage = latestMessageByTicketId.get(t.id);
            const userReplied = latestMessage?.sender === "user";
            const needsFirstReply = !latestMessage && !t.admin_note && normalizeTicketStatus(t.status) !== "closed";
            const needsAttention = userReplied || needsFirstReply;

            return (
              <div
                key={t.id}
                className={`px-6 py-4 ${needsAttention ? "bg-amber-50 ring-1 ring-inset ring-amber-200" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold">{t.title}</div>
                      {userReplied ? (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                          User replied
                        </span>
                      ) : null}
                      {needsFirstReply ? (
                        <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                          Needs reply
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-neutral-600">
                      Username:
                      <span className="ml-1 font-mono">{publicContactEmailToUsername(t.email) || "—"}</span>
                      <span className="mx-2 text-neutral-300">·</span>
                      {category}
                      <span className="mx-2 text-neutral-300">·</span>
                      {ticketStatusLabel(t.status)}
                      <span className="mx-2 text-neutral-300">·</span>
                      Updated {new Date(t.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
