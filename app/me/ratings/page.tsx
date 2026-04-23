import Link from "next/link";
import ConfirmDeleteButton from "@/components/ui/ConfirmDeleteButton";
import HeyMenu from "@/components/HeyMenu";
import { deleteMyReview } from "@/lib/actions";
import { requirePublicUserOrRedirect, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function MyRatingsPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const { user, username } = await requirePublicUserOrRedirect("/me/ratings");
  const supabase = createSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("reviews")
    .select(
      "id, teacher_id, quality, difficulty, would_take_again, comment, tags, course, grade, is_online, created_at, teacher:teachers(full_name, subject)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="bg-black text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/teachers" className="rounded bg-white px-2 py-1 text-xs font-black tracking-widest text-black" prefetch>
            RMT
          </Link>
          <div className="text-sm font-semibold">My Ratings</div>
          <div className="ml-auto">
            <HeyMenu heyName={publicUsernameToHey(username)} isAuthed />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {searchParams?.error ? (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{searchParams.error}</div>
        ) : null}
        {searchParams?.message ? (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            {searchParams.message}
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Your Ratings</div>
            <div className="mt-1 text-sm text-neutral-600">You can edit or delete ratings you posted.</div>
          </div>

          <Link href="/teachers" className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" prefetch>
            Browse teachers
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            Failed to load: {error.message}
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          {(rows ?? []).length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-sm text-neutral-700">
              You haven&apos;t posted any ratings yet.
              <div className="mt-4">
                <Link className="rounded-lg bg-black px-4 py-2 text-white" href="/teachers" prefetch>
                  Find a teacher
                </Link>
              </div>
            </div>
          ) : (
            (rows ?? []).map((r: any) => {
              const teacherObj = Array.isArray(r.teacher) ? r.teacher[0] : r.teacher;

              return (
                <div key={r.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xl font-extrabold tracking-tight">{teacherObj?.full_name ?? "Unknown Teacher"}</div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {teacherObj?.subject ?? "—"} ·{" "}
                        <Link className="underline underline-offset-2" href={`/teachers/${r.teacher_id}`} prefetch>
                          View teacher page
                        </Link>
                      </div>
                      <div className="mt-2 text-xs text-neutral-500">
                        Posted {formatDate(r.created_at)}
                        {r.course ? ` · ${String(r.course).toUpperCase()}` : ""}
                        {r.is_online ? " · Online" : ""}
                        {r.grade ? ` · Grade: ${r.grade}` : ""}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/me/ratings/${r.id}/edit`} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-neutral-50" prefetch>
                        Edit
                      </Link>

                      <form action={deleteMyReview}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <ConfirmDeleteButton className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800 hover:bg-rose-100">
                          Delete
                        </ConfirmDeleteButton>
                      </form>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-neutral-800">
                    <span className="font-semibold">Quality:</span> {r.quality}/5
                    <span className="mx-2 text-neutral-300">|</span>
                    <span className="font-semibold">Difficulty:</span> {r.difficulty}/5
                    <span className="mx-2 text-neutral-300">|</span>
                    <span className="font-semibold">Would take again:</span> {r.would_take_again ? "Yes" : "No"}
                  </div>

                  {Array.isArray(r.tags) && r.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.tags.map((t: string) => (
                        <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {r.comment ? (
                    <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-800">{r.comment}</p>
                  ) : (
                    <p className="mt-4 text-sm text-neutral-500">No comment.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
