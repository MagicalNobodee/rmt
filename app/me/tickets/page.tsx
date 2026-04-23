import Link from "next/link";
import HeyMenu from "@/components/HeyMenu";
import MyTicketsList from "@/components/MyTicketsList";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getLatestTicketMessageByTicketId } from "@/lib/ticketWorkflow.mjs";

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
  const tickets = (rows ?? []).map((ticket) => ({
    ...ticket,
    latestMessageSender: latestMessageByTicketId.get(ticket.id)?.sender ?? null,
  }));

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
        ) : (
          <MyTicketsList
            initialTickets={tickets as any}
            initialMessage={searchParams?.message}
            initialError={searchParams?.error}
          />
        )}
      </div>
    </main>
  );
}
