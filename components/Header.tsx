"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import HeyMenu from "@/components/HeyMenu";

export default function Header({
  heyName,
  isAuthed,
  active = "teachers",
  showSearch = true,
  searchAction = "/teachers",
  searchDefaultValue,
}: {
  heyName: string;
  isAuthed: boolean;
  active?: "teachers" | "my_ratings";
  showSearch?: boolean;
  searchAction?: string;
  searchDefaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(searchDefaultValue ?? params.get("q") ?? "");

  useEffect(() => {
    setQ(searchDefaultValue ?? params.get("q") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function submitSearch(nextQ: string) {
    const next = new URLSearchParams(params.toString());
    if (!nextQ.trim()) next.delete("q");
    else next.set("q", nextQ.trim());
    next.delete("page");
    const qs = next.toString();

    const basePath = pathname.startsWith("/teachers") ? "/teachers" : searchAction;
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <header className="bg-black text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="rounded bg-white px-2 py-1 text-xs font-black tracking-widest text-black" prefetch>
          RMT
        </Link>

        {showSearch ? (
          <div className="hidden items-center gap-3 md:flex">
            <div className="text-sm font-semibold">{active === "my_ratings" ? "My Ratings" : "Teachers"}</div>

            {active !== "my_ratings" ? (
              <>
                <form
                  className="relative"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitSearch(q);
                  }}
                >
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Teacher name"
                    className="h-9 w-[360px] rounded-full bg-white/10 px-4 text-sm outline-none placeholder:text-white/60 focus:bg-white/15"
                  />
                </form>

                <div className="text-sm text-white/70">at</div>

                <Link href="/teachers" className="text-sm font-semibold underline underline-offset-2 decoration-white/40" prefetch>
                  BIPH
                </Link>
              </>
            ) : null}
          </div>
        ) : (
          <div className="text-sm font-semibold">{active === "my_ratings" ? "My Ratings" : "Teachers"}</div>
        )}

        <div className="ml-auto">
          <HeyMenu heyName={heyName} isAuthed={isAuthed} />
        </div>
      </div>
    </header>
  );
}
