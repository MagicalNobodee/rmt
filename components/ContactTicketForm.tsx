"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { CONTACT_TICKET_DESCRIPTION_MIN_LENGTH, CONTACT_TICKET_TITLE_MIN_LENGTH } from "@/lib/contactTicket.mjs";

type ContactTicketFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: string[];
};

export default function ContactTicketForm({ action, categories }: ContactTicketFormProps) {
  const [category, setCategory] = React.useState(categories[0] ?? "Troubleshooting");
  const isOther = category === "Other";

  return (
    <form action={action} className="mt-8 space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <div className="grid gap-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-900">Category</label>
            <select
              name="category"
              value={category}
              onChange={(event) => setCategory(event.currentTarget.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {isOther ? (
            <div>
              <label className="block text-sm font-semibold text-neutral-900">
                Specify Other <span className="text-rose-600">*</span>
              </label>
              <input
                name="categoryOther"
                required
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
                placeholder="e.g. Teacher name correction"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Title <span className="text-rose-600">*</span>
            </label>
            <input
              name="title"
              required
              minLength={CONTACT_TICKET_TITLE_MIN_LENGTH}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none focus:border-neutral-400"
              placeholder="Short summary"
            />
            <div className="mt-2 text-xs text-neutral-500">
              At least {CONTACT_TICKET_TITLE_MIN_LENGTH} characters.
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Description <span className="text-rose-600">*</span>
            </label>
            <textarea
              name="description"
              required
              minLength={CONTACT_TICKET_DESCRIPTION_MIN_LENGTH}
              rows={7}
              className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="Describe your request in detail..."
            />
            <div className="mt-2 text-xs text-neutral-500">
              At least {CONTACT_TICKET_DESCRIPTION_MIN_LENGTH} characters. Max 2000 characters.
            </div>
          </div>

          <SubmitTicketButton />
        </div>
      </div>
    </form>
  );
}

function SubmitTicketButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      ) : null}
      {pending ? "Submitting..." : "Submit Ticket"}
    </button>
  );
}
