"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { signOutPublicUser } from "@/lib/actions";

function safeRedirectTo(path: string, fallback = "/teachers") {
  const v = (path ?? "").trim();
  if (!v) return fallback;
  if (!v.startsWith("/")) return fallback;
  if (v.startsWith("//")) return fallback;
  if (v.includes("://")) return fallback;
  return v;
}

export default function HeyMenu({
  heyName,
  isAuthed,
}: {
  heyName: string;
  isAuthed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const loginHref = useMemo(() => {
    if (typeof window === "undefined") {
      const rt = encodeURIComponent("/teachers");
      return `/login?mode=signin&redirectTo=${rt}`;
    }
    const current = safeRedirectTo(window.location.pathname + window.location.search, "/teachers");
    return `/login?mode=signin&redirectTo=${encodeURIComponent(current)}`;
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!isAuthed) {
    return (
      <Link
        href={loginHref}
        className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        prefetch={false}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold tracking-wide hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        HEY, {heyName}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-80">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border bg-white text-black shadow-lg"
        >
          <Link
            role="menuitem"
            href="/me/ratings"
            className="block px-4 py-3 text-sm hover:bg-neutral-50"
            onClick={() => setOpen(false)}
            prefetch
          >
            My Ratings
          </Link>

          <Link
            role="menuitem"
            href="/me/tickets"
            className="block px-4 py-3 text-sm hover:bg-neutral-50"
            onClick={() => setOpen(false)}
            prefetch
          >
            My Tickets
          </Link>

          <Link
            role="menuitem"
            href="/contact"
            className="block px-4 py-3 text-sm hover:bg-neutral-50"
            onClick={() => setOpen(false)}
            prefetch
          >
            Contact Us
          </Link>

          <div className="h-px bg-neutral-200" />

          <form
            action={() => {
              setOpen(false);
              startTransition(async () => {
                await signOutPublicUser();
              });
            }}
          >
            <button
              role="menuitem"
              type="submit"
              disabled={pending}
              className="block w-full px-4 py-3 text-left text-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              {pending ? "Logging out..." : "Logout"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
