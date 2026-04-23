// app/admin/(protected)/teachers/page.tsx
import AdminLink from "@/components/AdminLink";
import SubmitButton from "@/components/SubmitButton";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { adminCreateTeacher, adminDeleteTeacher } from "@/lib/admin/actions";

type TeacherRow = {
  id: string;
  full_name: string | null;
  subject: string | null; // legacy primary subject
  subjects: string[] | null; // new multi-subjects
};

function normalizeSubjects(t: TeacherRow): string[] {
  const arr = Array.isArray(t.subjects) ? t.subjects : [];
  const cleaned = arr.map((s) => (s ?? "").trim()).filter(Boolean);
  if (cleaned.length) return cleaned;
  if (t.subject?.trim()) return [t.subject.trim()];
  return [];
}

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams?: { message?: string; error?: string };
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("teachers")
    .select("id, full_name, subject, subjects")
    .order("full_name", { ascending: true });

  const teachers = (data ?? []) as TeacherRow[];

  return (
    <div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-neutral-500">Admin</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Teachers</h1>
            <div className="mt-1 text-sm text-neutral-600">
              Create / edit / delete teacher name & subjects (comma separated).
            </div>
          </div>
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
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Failed: {error.message}
          </div>
        ) : null}

        {/* Create */}
        <form action={adminCreateTeacher} className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="text-xs font-semibold text-neutral-600">Full name</div>
            <input
              name="full_name"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Alice Zhang"
              required
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-neutral-600">Subjects (comma separated)</div>
            <input
              name="subjects"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Math, Physics, Chemistry"
            />
            <div className="mt-1 text-xs text-neutral-500">
              The first subject will be treated as the primary subject for legacy views.
            </div>
          </div>

          <div className="md:col-span-3">
            <SubmitButton
              pendingText="Adding..."
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Add Teacher
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="mt-4 rounded-2xl border bg-white p-0 shadow-sm">
        <div className="border-b px-6 py-4 text-sm font-semibold">All teachers ({teachers.length})</div>

        <div className="divide-y">
          {teachers.map((t) => {
            const subs = normalizeSubjects(t);
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold">{t.full_name || "—"}</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    {subs.length ? subs.join(", ") : "—"}
                  </div>
                </div>

                <AdminLink
                  href={`/admin/teachers/${encodeURIComponent(t.id)}/edit`}
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                >
                  Edit
                </AdminLink>

                <form action={adminDeleteTeacher}>
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton
                    pendingText="Deleting..."
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    Delete
                  </SubmitButton>
                </form>
              </div>
            );
          })}

          {teachers.length === 0 ? (
            <div className="px-6 py-10 text-sm text-neutral-600">No teachers yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
