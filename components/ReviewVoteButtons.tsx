"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReviewVote } from "@/lib/actions";

export default function ReviewVoteButtons({
  teacherId,
  reviewId,
  upvotes,
  downvotes,
  myVote,
  isAuthed,
}: {
  teacherId: string;
  reviewId: string;
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | 0;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const redirectTo = `/teachers/${teacherId}#ratings`;
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;

  function submit(op: "up" | "down" | "clear") {
    const fd = new FormData();
    fd.set("teacherId", teacherId);
    fd.set("reviewId", reviewId);
    fd.set("op", op);

    startTransition(async () => {
      await setReviewVote(fd);
      router.refresh();
    });
  }

  if (!isAuthed) {
    return (
      <div className="mt-4 flex items-center gap-5 text-sm text-neutral-600">
        <Link className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-neutral-50" href={loginHref} prefetch>
          👍 <span className="font-semibold">{upvotes}</span>
        </Link>
        <Link className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-neutral-50" href={loginHref} prefetch>
          👎 <span className="font-semibold">{downvotes}</span>
        </Link>
        <span className="text-xs text-neutral-500">(Sign in to vote)</span>
      </div>
    );
  }

  const nextUpOp: "up" | "clear" = myVote === 1 ? "clear" : "up";
  const nextDownOp: "down" | "clear" = myVote === -1 ? "clear" : "down";

  return (
    <div className="mt-4 flex items-center gap-5 text-sm">
      <button
        type="button"
        disabled={pending}
        onClick={() => submit(nextUpOp)}
        className={[
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60",
          myVote === 1 ? "bg-emerald-50 border-emerald-200" : "",
        ].join(" ")}
        aria-label="Like rating"
      >
        👍 <span className="font-semibold">{upvotes}</span>
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => submit(nextDownOp)}
        className={[
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60",
          myVote === -1 ? "bg-rose-50 border-rose-200" : "",
        ].join(" ")}
        aria-label="Dislike rating"
      >
        👎 <span className="font-semibold">{downvotes}</span>
      </button>

      {pending ? <span className="text-xs text-neutral-500">Saving…</span> : null}
    </div>
  );
}
