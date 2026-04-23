import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import BackButton from "@/components/BackButton";
import ContactTicketForm from "@/components/ContactTicketForm";
import { getCurrentPublicUser, requirePublicUserOrRedirect } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { publicUsernameToInternalEmail } from "@/lib/publicUserAuth.mjs";
import { CONTACT_TICKET_CATEGORIES, normalizeContactTicketForm } from "@/lib/contactTicket.mjs";

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: { success?: string; error?: string; ticket?: string };
}) {
  async function createTicket(formData: FormData) {
    "use server";

    const { user, username } = await requirePublicUserOrRedirect("/contact");
    const supabase = createSupabaseAdminClient();

    const hdrs = headers();
    const pageUrl = hdrs.get("referer") ?? "";
    const userAgent = hdrs.get("user-agent") ?? "";

    const normalized = normalizeContactTicketForm(formData);
    if (normalized.error || !normalized.value) {
      redirect(`/contact?error=${encodeURIComponent(normalized.error ?? "Please check your input and try again.")}`);
    }
    const ticket = normalized.value;

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        email: publicUsernameToInternalEmail(username),
        category: ticket.category,
        category_other: ticket.category_other,
        title: ticket.title,
        description: ticket.description,
        page_url: pageUrl,
        user_agent: userAgent,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      redirect(
        `/contact?error=${encodeURIComponent(error?.message ?? "Failed to submit. Please try again.")}`
      );
    }

    redirect(`/contact?success=1&ticket=${encodeURIComponent(String(data.id))}`);
  }

  const current = await getCurrentPublicUser();
  const ok = searchParams?.success === "1";
  const err = searchParams?.error ?? "";
  const ticketId = searchParams?.ticket ?? "";

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <BackButton
            fallbackHref="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            <span aria-hidden>←</span>
            Back
          </BackButton>

          <div className="text-xs text-neutral-500">Rate My Teacher · BIPH</div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-sm text-neutral-700">Submit a ticket for help, partnerships, or suggestions.</p>

        {ok ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Submitted successfully ✅</div>
            {ticketId ? (
              <div className="mt-1">
                Ticket ID: <span className="font-mono font-semibold">{shortId(ticketId)}</span>
                <span className="mx-2 text-emerald-300">·</span>
                <Link className="underline underline-offset-2" href="/me/tickets" prefetch>
                  View My Tickets
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Submission failed. {err}
          </div>
        ) : null}

        {!current ? (
          <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <div className="text-lg font-semibold text-neutral-900">Sign in required</div>
            <p className="mt-2 text-sm text-neutral-700">You can browse the site without an account, but submitting a ticket requires signing in.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/login?mode=signin&redirectTo=${encodeURIComponent("/contact")}`}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                prefetch
              >
                Sign in
              </Link>
              <Link
                href={`/login?mode=signup&redirectTo=${encodeURIComponent("/contact")}`}
                className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-50"
                prefetch
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <ContactTicketForm action={createTicket} categories={CONTACT_TICKET_CATEGORIES} />
        )}

        {current ? (
          <div className="mt-6 text-xs text-neutral-500">
            Tip: You can track ticket status on <Link className="underline" href="/me/tickets">My Tickets</Link>.
          </div>
        ) : null}
      </div>
    </main>
  );
}
