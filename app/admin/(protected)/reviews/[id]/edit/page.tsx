// app/admin/(protected)/reviews/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { publicUsernameFromUser } from "@/lib/publicUserAuth.mjs";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { adminDeleteReview, adminUpdateReview } from "@/lib/admin/actions";

export default async function AdminReviewEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();

  // 1) 先取 review（不做嵌套 join）
  const { data: r, error } = await supabase
    .from("reviews")
    .select("id, teacher_id, user_id, quality, difficulty, would_take_again, comment, tags, course, grade, is_online, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !r) notFound();

  // 2) 再取 teacher
  const { data: teacher } = await supabase
    .from("teachers")
    .select("full_name, subject")
    .eq("id", r.teacher_id)
    .maybeSingle();

  // 3) 取用户邮箱
  const userRes = await supabase.auth.admin.getUserById(r.user_id);
  const reviewer = publicUsernameFromUser(userRes.data.user) || userRes.data.user?.email || "—";

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-neutral-500">Reviews</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Edit</h1>
          <div className="mt-1 text-sm text-neutral-600">
            Teacher: <span className="font-semibold">{teacher?.full_name || "—"}</span>
            <span className="mx-2 text-neutral-300">·</span>
            Username: <span className="font-mono">{reviewer}</span>
          </div>
        </div>

        <Link
          href="/admin/reviews"
          className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          ← Back
        </Link>
      </div>

      {searchParams?.error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams?.message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {searchParams.message}
        </div>
      ) : null}

      <form action={adminUpdateReview} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="teacher_id" value={r.teacher_id} />

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold text-neutral-600">Quality (1-5)</div>
            <input
              name="quality"
              type="number"
              min={1}
              max={5}
              defaultValue={r.quality ?? 5}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-600">Difficulty (1-5)</div>
            <input
              name="difficulty"
              type="number"
              min={1}
              max={5}
              defaultValue={r.difficulty ?? 5}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-600">Would take again</div>
            <select
              name="would_take_again"
              defaultValue={r.would_take_again ? "yes" : "no"}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-neutral-600">Course / Subject</div>
            <input
              name="course"
              defaultValue={r.course ?? ""}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. MATH101 / Math"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-600">Grade</div>
            <input
              name="grade"
              defaultValue={r.grade ?? ""}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. A"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-600">Tags (comma separated)</div>
          <input
            name="tags"
            defaultValue={(r.tags ?? []).join(", ")}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="TOUGH, FUN, ..."
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-600">Online</div>
          <label className="mt-2 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_online" value="1" defaultChecked={!!r.is_online} />
            is_online
          </label>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-600">Comment</div>
          <textarea
            name="comment"
            defaultValue={r.comment ?? ""}
            className="mt-1 h-40 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="review text..."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <SubmitButton
            pendingText="Saving..."
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Save
          </SubmitButton>
        </div>
      </form>

      <form action={adminDeleteReview} className="mt-3">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="teacher_id" value={r.teacher_id} />
        <SubmitButton
          pendingText="Deleting..."
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
        >
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}
