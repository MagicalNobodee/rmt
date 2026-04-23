// app/teachers/[id]/rate/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicUsernameToHey, requirePublicUserOrRedirect } from "@/lib/publicUserSession";
import { createSupabaseServerClient } from "@/lib/supabase";
import RateForm from "@/components/RateForm";

export default async function RatePage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const teacherId = params.id;
  const current = await requirePublicUserOrRedirect(`/teachers/${teacherId}/rate`);

  // load teacher (now includes subjects)
  const { data: teacher, error: tErr } = await supabase
    .from("teachers")
    .select("id, full_name, subject, subjects")
    .eq("id", teacherId)
    .maybeSingle();

  if (tErr || !teacher) notFound();

  // normalize subjects: prefer teachers.subjects (text[]), fallback to teachers.subject
  const rawSubjects = (teacher as any).subjects as string[] | null | undefined;
  const teacherSubjects: string[] =
    Array.isArray(rawSubjects) && rawSubjects.length
      ? rawSubjects
      : teacher.subject
        ? [teacher.subject]
        : [];

  const heyName = publicUsernameToHey(current.username);

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* ✅ No page-level <header> here: do NOT modify global header */}

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* ✅ Back button moved into page content (Help removed) */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/teachers/${teacherId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            <span aria-hidden>←</span>
            Back
          </Link>

          <div className="ml-auto text-sm font-extrabold tracking-wide text-neutral-800">
            HEY, {heyName}
          </div>
        </div>

        {/* Page header */}
        <div className="mb-8">
          <div className="text-5xl font-extrabold tracking-tight">{teacher.full_name}</div>
          <div className="text-2xl font-medium text-neutral-800">Add Rating</div>
          <div className="mt-2 text-sm text-neutral-700">
            <span className="font-semibold">
              {teacher.subject ?? teacherSubjects[0] ?? "—"}
            </span>
            <span className="mx-2 text-neutral-300">·</span>
            <span className="underline underline-offset-2 decoration-neutral-300">BIPH</span>
          </div>
        </div>

        <RateForm teacherId={teacherId} teacherSubjects={teacherSubjects} />
      </div>
    </main>
  );
}
