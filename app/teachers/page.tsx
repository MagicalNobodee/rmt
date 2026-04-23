// app/teachers/page.tsx
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import TeachersInfiniteList from "@/components/TeachersInfiniteList";
import { getCurrentPublicUser, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseServerClient } from "@/lib/supabase";
import { fetchTeacherListPage, TEACHERS_PAGE_SIZE } from "@/lib/teacherList";

type PageProps = {
  searchParams?: {
    q?: string;
    subject?: string;
  };
};

export default async function TeachersPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServerClient();
  const current = await getCurrentPublicUser();

  const q = (searchParams?.q ?? "").trim();
  const subject = (searchParams?.subject ?? "").trim();

  // fetch subjects (for "Any" dropdown)
  const { data: subjectRows } = await supabase.from("teachers").select("subject").order("subject", { ascending: true });

  const subjects = Array.from(new Set((subjectRows ?? []).map((r) => r.subject).filter(Boolean) as string[]));
  let teachersPage = null;
  let errorMessage: string | null = null;

  try {
    teachersPage = await fetchTeacherListPage(supabase, { q, subject, page: 1 });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to load teachers.";
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* TOP NAV */}
      <Header
        heyName={publicUsernameToHey(current?.username)}
        isAuthed={!!current}
        active="teachers"
        showSearch
        searchDefaultValue={q}
      />

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* big search + Any dropdown */}
        <SearchBar subjects={subjects} />

        <div className="mt-8 text-2xl font-medium tracking-tight">
          {(teachersPage?.count ?? 0).toLocaleString()} teachers at <span className="font-extrabold">BIPH</span>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            Failed to load teachers: {errorMessage}
          </div>
        ) : teachersPage ? (
          <TeachersInfiniteList
            initialTeachers={teachersPage.teachers}
            initialCount={teachersPage.count}
            initialPage={teachersPage.page}
            pageSize={TEACHERS_PAGE_SIZE}
            q={q}
            subject={subject}
          />
        ) : null}
      </div>
    </main>
  );
}
