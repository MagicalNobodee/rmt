// app/admin/(protected)/tickets/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { adminUpdateTicket } from "@/lib/admin/actions";
import { publicContactEmailToUsername } from "@/lib/publicUserAuth.mjs";
import { normalizeTicketStatus, ticketStatusLabel } from "@/lib/ticketWorkflow.mjs";

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

  const { data: messageRows } = await supabase
    .from("support_ticket_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", t.id)
    .order("created_at", { ascending: true });

  const category = t.category === "Other" && t.category_other ? `Other: ${t.category_other}` : t.category;
  const adminResponse = t.admin_note?.trim() || "";
  const threadedMessages = (messageRows ?? []) as Array<{
    id: string;
    sender: string;
    body: string;
    created_at: string;
  }>;
  const hasThreadedAdminMessage = threadedMessages.some((message) => message.sender === "admin");
  const conversation = [
    {
      id: "initial",
      sender: "user",
      body: t.description,
      created_at: t.created_at,
    },
    ...threadedMessages,
    ...(adminResponse && !hasThreadedAdminMessage
      ? [
          {
            id: "legacy-admin-note",
            sender: "admin",
            body: adminResponse,
            created_at: t.updated_at,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const latestUserMessage = [...threadedMessages]
    .filter((message) => message.sender === "user")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

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
          <div className="mt-3">
            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-800">
              {ticketStatusLabel(t.status)}
            </span>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border bg-neutral-50 p-4">
          <div className="text-xs font-semibold text-neutral-600">Conversation</div>
          {latestUserMessage ? (
            <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-amber-950 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-amber-800">
                <span>Latest user reply</span>
                <span>{formatDateTime(latestUserMessage.created_at)}</span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm font-semibold">{latestUserMessage.body}</div>
            </div>
          ) : null}
          <div className="mt-3 space-y-3">
            {conversation.map((message) => {
              const isAdmin = message.sender === "admin";

              return (
                <div
                  key={message.id}
                  className={`rounded-2xl border p-4 ${
                    isAdmin
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : "border-amber-200 bg-white text-neutral-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                    <span>{isAdmin ? "Admin" : "User"}</span>
                    <span className={isAdmin ? "text-emerald-800" : "text-neutral-500"}>
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">{message.body}</div>
                </div>
              );
            })}
          </div>
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
            defaultValue={normalizeTicketStatus(t.status) ?? "open"}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-600">New reply</div>
          <textarea
            name="body"
            className="mt-1 h-40 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="Write your response to the user..."
            maxLength={2000}
          />
          <div className="mt-2 text-xs text-neutral-500">
            Leave this blank to update status only. Replies are appended to the conversation history.
          </div>
        </div>

        <SubmitButton
          pendingText="Updating..."
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Update Ticket
        </SubmitButton>
      </form>
    </div>
  );
}
