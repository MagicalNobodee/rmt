"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function adminUrlFromHref(href: string) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (!url.pathname.startsWith("/admin")) return null;
    return url;
  } catch {
    return null;
  }
}

export default function AdminRouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const previousLocationKey = useRef(locationKey);
  const startedAt = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    };

    const showTransition = () => {
      clearHideTimer();
      startedAt.current = Date.now();
      setActive(true);
      hideTimer.current = window.setTimeout(() => setActive(false), 6000);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const nextUrl = adminUrlFromHref(anchor.href);
      if (!nextUrl) return;

      const currentUrl = new URL(window.location.href);
      const currentTarget = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      const nextTarget = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentTarget === nextTarget) return;

      showTransition();
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      if (!(event.target instanceof HTMLFormElement)) return;

      showTransition();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    if (previousLocationKey.current === locationKey) return;

    previousLocationKey.current = locationKey;
    if (!startedAt.current) return;

    router.refresh();

    if (hideTimer.current) window.clearTimeout(hideTimer.current);

    const elapsed = Date.now() - startedAt.current;
    const delay = Math.max(450 - elapsed, 150);
    hideTimer.current = window.setTimeout(() => setActive(false), delay);
  }, [locationKey, router]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]" role="status" aria-live="polite">
      <div className="h-1 overflow-hidden bg-neutral-200">
        <div className="h-full w-2/3 animate-pulse rounded-r-full bg-black shadow-[0_0_18px_rgba(0,0,0,0.35)]" />
      </div>
      <div className="fixed right-4 top-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/95 px-3 py-2 text-xs font-extrabold text-neutral-950 shadow-lg backdrop-blur">
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-black"
        />
        Loading admin...
      </div>
    </div>
  );
}
