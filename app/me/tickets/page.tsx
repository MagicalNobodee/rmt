import Link from "next/link";
import HeyMenu from "@/components/HeyMenu";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
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

export default async function MyTicketsPage() {
  const { user, username } = await requirePublicUserOrRedirect("/me/tickets");
  const supabase = createSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("support_tickets")
    .select("id, created_at, category, category_other, title, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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

              return (
                <Link key={t.id} href={`/me/tickets/${t.id}`} className="block rounded-2xl border bg-white p-6 shadow-sm transition hover:bg-neutral-50" prefetch>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500">
                        {formatDate(t.created_at)} · <span className="font-mono">{shortId(t.id)}</span>
                      </div>

                      <div className="mt-1 text-xl font-extrabold tracking-tight">{t.title}</div>
                      <div className="mt-2 text-sm text-neutral-700">{cat}</div>
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                        {statusLabel(t.status)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
