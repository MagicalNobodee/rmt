import Link from "next/link";
import HeyMenu from "@/components/HeyMenu";
import ConfirmDeleteButton from "@/components/ui/ConfirmDeleteButton";
import { deleteMyTicket } from "@/lib/actions";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getLatestTicketMessageByTicketId, ticketStatusLabel } from "@/lib/ticketWorkflow.mjs";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M7 4.5h6M8.5 4.5V3.25h3V4.5m-6 3h9m-8.25 0 .5 8.25h6.5l.5-8.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function MyTicketsPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const { user, username } = await requirePublicUserOrRedirect("/me/tickets");
  const supabase = createSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("support_tickets")
    .select("id, created_at, updated_at, category, category_other, title, status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

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
    <main className="min-h-screen bg-neutral-50">
      <header className="bg-black text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/teachers" className="rounded bg-white px-2 py-1 text-xs font-black tracking-widest text-black" prefetch>
            RMT
          </Link>

          <div className="text-sm font-semibold">My Tickets</div>

          <div className="ml-auto">
            <HeyMenu heyName={publicUsernameToHey(username)} isAuthed />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Tickets</div>
            <div className="mt-1 text-sm text-neutral-600">All tickets you submitted through the Contact Us form will appear here.</div>
          </div>

          <Link href="/contact" className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" prefetch>
            New Ticket
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            Failed to load: {error.message}
          </div>
        ) : null}
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

        <div className="mt-6 space-y-4">
          {(rows ?? []).length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-sm text-neutral-700">
              You haven’t submitted any tickets yet.
              <div className="mt-4">
                <Link className="rounded-lg bg-black px-4 py-2 text-white" href="/contact" prefetch>
                  Create one
                </Link>
              </div>
            </div>
          ) : (
            (rows ?? []).map((t: any) => {
              const cat = t.category === "Other" && t.category_other ? `Other: ${t.category_other}` : (t.category as string);
              const latestMessage = latestMessageByTicketId.get(t.id);

              return (
                <article key={t.id} className="relative rounded-2xl border bg-white shadow-sm transition hover:bg-neutral-50">
                  <Link href={`/me/tickets/${t.id}`} className="block p-6 pr-16" prefetch>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-500">
                          Updated {formatDate(t.updated_at)} · <span className="font-mono">{shortId(t.id)}</span>
                        </div>

                        <div className="mt-1 text-xl font-extrabold tracking-tight">{t.title}</div>
                        <div className="mt-2 text-sm text-neutral-700">{cat}</div>

                        {latestMessage ? (
                          <div className="mt-3">
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                              {latestMessage.sender === "admin" ? "Admin replied" : "You replied"}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                          {ticketStatusLabel(t.status)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <form action={deleteMyTicket} className="absolute bottom-4 right-4">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <ConfirmDeleteButton
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                      confirmText="Delete this ticket? This cannot be undone."
                    >
                      <TrashIcon />
                      <span className="sr-only">Delete ticket {t.title}</span>
                    </ConfirmDeleteButton>
                  </form>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
