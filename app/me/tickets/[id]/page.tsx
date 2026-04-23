import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { addMyTicketMessage } from "@/lib/actions";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { isClosedTicketStatus, ticketStatusLabel } from "@/lib/ticketWorkflow.mjs";

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

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { message?: string; error?: string };
}) {
  const { user, username } = await requirePublicUserOrRedirect(`/me/tickets/${params.id}`);
  const supabase = createSupabaseAdminClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, category, category_other, title, description, status, admin_note")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !ticket) notFound();

  const { data: messageRows } = await supabase
    .from("support_ticket_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  const category = ticket.category === "Other" && ticket.category_other ? `Other: ${ticket.category_other}` : ticket.category;
  const adminResponse = ticket.admin_note?.trim() || "";
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
      body: ticket.description,
      created_at: ticket.created_at,
    },
    ...threadedMessages,
    ...(adminResponse && !hasThreadedAdminMessage
      ? [
          {
            id: "legacy-admin-note",
            sender: "admin",
            body: adminResponse,
            created_at: ticket.updated_at,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const isClosed = isClosedTicketStatus(ticket.status);

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
                {ticketStatusLabel(ticket.status)}
              </span>
            </div>
          </div>

          {searchParams?.error ? (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              {searchParams.error}
            </div>
          ) : null}
          {searchParams?.message ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {searchParams.message}
            </div>
          ) : null}

          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-900">Conversation</div>
            <div className="mt-3 space-y-3">
              {conversation.map((message) => {
                const isAdmin = message.sender === "admin";

                return (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-4 ${
                      isAdmin
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-neutral-200 bg-neutral-50 text-neutral-900"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span>{isAdmin ? "Admin" : "You"}</span>
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

          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-900">Add a message</div>
            {isClosed ? (
              <div className="mt-2 rounded-xl border bg-neutral-100 p-4 text-sm text-neutral-600">
                This ticket is closed. You can no longer add new messages.
              </div>
            ) : (
              <form action={addMyTicketMessage} className="mt-2 space-y-3">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <textarea
                  name="body"
                  className="h-32 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                  placeholder="Write a follow-up message..."
                  maxLength={2000}
                  required
                />
                <SubmitButton
                  pendingText="Sending..."
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send Message
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
