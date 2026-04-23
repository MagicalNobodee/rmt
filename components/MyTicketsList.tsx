"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMyTicket } from "@/lib/actions";
import { ticketStatusLabel } from "@/lib/ticketWorkflow.mjs";

type TicketListItem = {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  category_other: string | null;
  title: string;
  status: string;
  latestMessageSender: string | null;
};

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

export default function MyTicketsList({
  initialTickets,
  initialMessage,
  initialError,
}: {
  initialTickets: TicketListItem[];
  initialMessage?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(ticketId: string) {
    const target = tickets.find((ticket) => ticket.id === ticketId);
    if (!target) return;
    if (!confirm("Delete this ticket? This cannot be undone.")) return;

    const previousTickets = tickets;
    setPendingTicketId(ticketId);
    setError("");
    setMessage("");
    setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));

    startTransition(async () => {
      const result = await deleteMyTicket(ticketId);

      if (!result.ok) {
        setTickets(previousTickets);
        setError(result.error ?? "Delete failed.");
        setPendingTicketId(null);
        return;
      }

      setMessage(result.message ?? "Ticket deleted.");
      setPendingTicketId(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6">
      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className={`${error ? "mt-4" : ""} rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900`}>
          {message}
        </div>
      ) : null}

      <div className={`${error || message ? "mt-4" : ""} space-y-4`}>
        {tickets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-sm text-neutral-700">
            You haven’t submitted any tickets yet.
            <div className="mt-4">
              <Link className="rounded-lg bg-black px-4 py-2 text-white" href="/contact" prefetch>
                Create one
              </Link>
            </div>
          </div>
        ) : (
          tickets.map((ticket) => {
            const category =
              ticket.category === "Other" && ticket.category_other ? `Other: ${ticket.category_other}` : ticket.category;
            const deleting = pendingTicketId === ticket.id && isPending;

            return (
              <article
                key={ticket.id}
                className={`relative rounded-2xl border bg-white shadow-sm transition hover:bg-neutral-50 ${
                  deleting ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <Link href={`/me/tickets/${ticket.id}`} className="block p-6 pr-16" prefetch>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500">
                        Updated {formatDate(ticket.updated_at)} · <span className="font-mono">{shortId(ticket.id)}</span>
                      </div>

                      <div className="mt-1 text-xl font-extrabold tracking-tight">{ticket.title}</div>
                      <div className="mt-2 text-sm text-neutral-700">{category}</div>

                      {ticket.latestMessageSender ? (
                        <div className="mt-3">
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                            {ticket.latestMessageSender === "admin" ? "Admin replied" : "You replied"}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                        {ticketStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(ticket.id)}
                  disabled={isPending}
                  aria-busy={deleting}
                  className="absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                  ) : (
                    <TrashIcon />
                  )}
                  <span className="sr-only">{deleting ? `Deleting ticket ${ticket.title}` : `Delete ticket ${ticket.title}`}</span>
                </button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
