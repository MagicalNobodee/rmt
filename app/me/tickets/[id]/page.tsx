import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const { user, username } = await requirePublicUserOrRedirect(`/me/tickets/${params.id}`);
  const supabase = createSupabaseAdminClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, category, category_other, title, description, status, admin_note")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !ticket) notFound();

  const category = ticket.category === "Other" && ticket.category_other ? `Other: ${ticket.category_other}` : ticket.category;
  const adminResponse = ticket.admin_note?.trim() || "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="bg-black text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/teachers" className="rounded bg-white px-2 py-1 text-xs font-black tracking-widest text-black" prefetch>
            RMT
          </Link>

          <div className="text-sm font-semibold">Ticket</div>

          <div className="ml-auto text-sm font-extrabold tracking-wide">HEY, {publicUsernameToHey(username)}</div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/me/tickets"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
            prefetch
          >
            <span aria-hidden>←</span>
            Back to My Tickets
          </Link>

          <div className="text-xs text-neutral-500">
            Ticket ID: <span className="font-mono">{shortId(ticket.id)}</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-neutral-500">
                Created: {formatDateTime(ticket.created_at)}
                <span className="mx-2 text-neutral-300">·</span>
                Updated: {formatDateTime(ticket.updated_at)}
              </div>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{ticket.title}</h1>
              <div className="mt-2 text-sm text-neutral-700">{category}</div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                {statusLabel(ticket.status)}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-900">Description</div>
            <div className="mt-2 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800">{ticket.description}</div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-900">Admin Response</div>
            {adminResponse ? (
              <div className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                {adminResponse}
              </div>
            ) : (
              <div className="mt-2 rounded-xl border bg-white p-4 text-sm text-neutral-600">No response yet. Please check back later.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
