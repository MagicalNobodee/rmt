import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { fetchTeacherListPage } from "@/lib/teacherList";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get("q") ?? "").trim();
  const subject = (searchParams.get("subject") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  try {
    const supabase = createSupabaseServerClient();
    const result = await fetchTeacherListPage(supabase, { q, subject, page });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teachers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
