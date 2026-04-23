import type { TeacherListItem } from "@/types";

export const TEACHERS_PAGE_SIZE = 10;

type TeacherListPageParams = {
  q?: string;
  subject?: string;
  page?: number;
};

export type TeacherListPageResult = {
  teachers: TeacherListItem[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export async function fetchTeacherListPage(
  supabase: any,
  { q = "", subject = "", page = 1 }: TeacherListPageParams
): Promise<TeacherListPageResult> {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const from = (safePage - 1) * TEACHERS_PAGE_SIZE;
  const to = from + TEACHERS_PAGE_SIZE - 1;

  let query = supabase
    .from("teacher_list")
    .select("id, full_name, subject, avg_quality, review_count, pct_would_take_again, avg_difficulty", {
      count: "exact",
    })
    .order("review_count", { ascending: false })
    .order("full_name", { ascending: true })
    .range(from, to);

  const trimmedQ = q.trim();
  const trimmedSubject = subject.trim();

  if (trimmedQ) query = query.ilike("full_name", `%${trimmedQ}%`);
  if (trimmedSubject) query = query.eq("subject", trimmedSubject);

  const { data, error, count } = await query;

  if (error) throw error;

  const totalCount = count ?? 0;
  const teachers = (data ?? []) as TeacherListItem[];

  return {
    teachers,
    count: totalCount,
    page: safePage,
    pageSize: TEACHERS_PAGE_SIZE,
    hasMore: safePage * TEACHERS_PAGE_SIZE < totalCount,
  };
}
