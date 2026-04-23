// app/admin/(protected)/tickets/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { adminUpdateTicket } from "@/lib/admin/actions";
import { publicContactEmailToUsername } from "@/lib/publicUserAuth.mjs";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminTicketDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();

  const { data: t, error } = await supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, email, category, category_other, title, description, status, admin_note, page_url, user_agent")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !t) notFound();

  const category = t.category === "Other" && t.category_other ? `Other: ${t.category_other}` : t.category;

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-neutral-500">Tickets</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{t.title}</h1>
          <div className="mt-1 text-sm text-neutral-600">
            Username: <span className="font-mono">{publicContactEmailToUsername(t.email) || "—"}</span>
            <span className="mx-2 text-neutral-300">·</span>
            {category}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Created: {formatDateTime(t.created_at)} <span className="mx-2 text-neutral-300">·</span>
            Updated: {formatDateTime(t.updated_at)}
          </div>
        </div>

        <Link href="/admin/tickets" className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50">
          ← Back
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-neutral-50 p-4">
          <div className="text-xs font-semibold text-neutral-600">Description</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{t.description}</div>
        </div>

        <div className="rounded-2xl border bg-neutral-50 p-4">
          <div className="text-xs font-semibold text-neutral-600">Meta</div>
          <div className="mt-2 space-y-2 text-xs text-neutral-700">
            <div>
              <span className="font-semibold">page_url:</span> {t.page_url || "—"}
            </div>
            <div>
              <span className="font-semibold">user_agent:</span> {t.user_agent || "—"}
            </div>
          </div>
        </div>
      </div>

      <form action={adminUpdateTicket} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={t.id} />

        <div>
          <div className="text-xs font-semibold text-neutral-600">Status</div>
          <select
            name="status"
            defaultValue={t.status}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-600">Reply (admin_note)</div>
          <textarea
            name="admin_note"
            defaultValue={t.admin_note ?? ""}
            className="mt-1 h-40 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="Write your response to the user..."
          />
          <div className="mt-2 text-xs text-neutral-500">
            This reply is stored in `admin_note` for internal follow-up and future ticket handling.
          </div>
        </div>

        <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Update Ticket
        </button>
      </form>
    </div>
  );
}
