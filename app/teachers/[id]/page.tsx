// app/teachers/[id]/page.tsx
import Header from "@/components/Header";
import ReviewVoteButtons from "@/components/ReviewVoteButtons";
import { getCurrentPublicUser, publicUsernameToHey } from "@/lib/publicUserSession";
import { createSupabaseServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";

function ratingClass(avg: number | null) {
  if (avg === null) return "bg-neutral-200 text-neutral-900";
  if (avg < 2) return "bg-rose-200 text-neutral-900";
  if (avg < 3) return "bg-orange-200 text-neutral-900";
  if (avg < 4) return "bg-yellow-200 text-neutral-900";
  return "bg-emerald-200 text-neutral-900";
}

function fmt1(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(1);
}

function fmtPct(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}%`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

type PageProps = {
  params: { id: string };
  searchParams?: { course?: string; error?: string };
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  subject: string | null;
  avg_quality: number | null;
  review_count: number | null;
  pct_would_take_again: number | null;
  avg_difficulty: number | null;
};

type DistRow = {
  q5: number | null;
  q4: number | null;
  q3: number | null;
  q2: number | null;
  q1: number | null;
};

type TagRow = { tag: string | null; cnt: number | null };
type CourseRow = { course: string | null };

type ReviewRow = {
  id: string;
  quality: number | null;
  difficulty: number | null;
  would_take_again: boolean | null;
  comment: string | null;
  tags: string[] | null;
  course: string | null;
  created_at: string;
};

export default async function TeacherPage({ params, searchParams }: PageProps) {
  const supabase = createSupabaseServerClient();
  const teacherId = params.id;
  const current = await getCurrentPublicUser();
  const isAuthed = !!current;
  const heyName = publicUsernameToHey(current?.username);

  const selectedCourse = (searchParams?.course ?? "").trim();

  // 1) Fetch teacher first (needed for maxReviewsToFetch)
  const { data: teacher, error: teacherErr } = await supabase
    .from("teacher_list")
    .select("id, full_name, subject, avg_quality, review_count, pct_would_take_again, avg_difficulty")
    .eq("id", teacherId)
    .maybeSingle<TeacherRow>();

  if (teacherErr || !teacher) notFound();

  // Cap reviews to keep payload reasonable
  const maxReviewsToFetch = Math.min(Number(teacher.review_count ?? 200) || 200, 1000);

  // 2) Fetch the rest in parallel to reduce TTFB / “卡顿”
  const [distRes, topTagsRes, courseRowsRes, reviewsRes] = await Promise.all([
    supabase
      .from("teacher_quality_distribution")
      .select("q5,q4,q3,q2,q1")
      .eq("teacher_id", teacherId)
      .maybeSingle<DistRow>(),

    supabase
      .from("teacher_top_tags")
      .select("tag,cnt")
      .eq("teacher_id", teacherId)
      .order("cnt", { ascending: false })
      .limit(10),

    // Note: keeping logic same (still reads from reviews),
    // but we avoid extra work where possible.
    supabase.from("reviews").select("course").eq("teacher_id", teacherId).not("course", "is", null),

    (() => {
      let q = supabase
        .from("reviews")
        .select("id, quality, difficulty, would_take_again, comment, tags, course, created_at")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(maxReviewsToFetch);

      if (selectedCourse) q = q.eq("course", selectedCourse);
      return q;
    })(),
  ]);

  const dist = distRes.data ?? null;
  const topTagsRows = (topTagsRes.data ?? []) as TagRow[];
  const courseRows = (courseRowsRes.data ?? []) as CourseRow[];
  const reviews = (reviewsRes.data ?? []) as ReviewRow[];
  const reviewsErr = reviewsRes.error ?? null;

  // Rating distribution
  const counts = {
    5: dist?.q5 ?? 0,
    4: dist?.q4 ?? 0,
    3: dist?.q3 ?? 0,
    2: dist?.q2 ?? 0,
    1: dist?.q1 ?? 0,
  };

  const totalRatings = (teacher.review_count ?? 0) || Object.values(counts).reduce((a, b) => a + b, 0);

  // Top tags
  const topTags = topTagsRows.map((r) => String(r.tag ?? "")).filter(Boolean);

  // Course dropdown options (dedupe + sort)
  const courseOptions = Array.from(new Set(courseRows.map((r) => r.course).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );

  // Votes (counts + my vote)
  const reviewIds = reviews.map((r) => r.id);

  const [countRowsRes, myVotesRes] = await Promise.all([
    reviewIds.length > 0
      ? supabase.rpc("get_review_vote_counts", { review_ids: reviewIds })
      : Promise.resolve({ data: [] as any[] }),

    isAuthed && reviewIds.length > 0
      ? supabase.from("review_votes").select("review_id,vote").in("review_id", reviewIds).eq("user_id", current.user.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const countRows = (countRowsRes as any)?.data ?? [];
  const myVotes = (myVotesRes as any)?.data ?? [];

  const countsByReview = new Map<string, { up: number; down: number }>();
  for (const row of countRows) {
    const id = String(row.review_id);
    countsByReview.set(id, {
      up: Number(row.upvotes ?? 0),
      down: Number(row.downvotes ?? 0),
    });
  }

  const myVoteByReview = new Map<string, 1 | -1>();
  for (const v of myVotes) {
    const vv = Number(v.vote);
    if (vv === 1 || vv === -1) myVoteByReview.set(String(v.review_id), vv);
  }

  // Sort by most upvotes, then fewer downvotes, then newest
  const sortedReviews = reviews.slice().sort((a, b) => {
    const aKey = String(a.id);
    const bKey = String(b.id);
    const aCounts = countsByReview.get(aKey) ?? { up: 0, down: 0 };
    const bCounts = countsByReview.get(bKey) ?? { up: 0, down: 0 };

    if (bCounts.up !== aCounts.up) return bCounts.up - aCounts.up;
    if (aCounts.down !== bCounts.down) return aCounts.down - bCounts.down;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const rateHref = isAuthed
    ? `/teachers/${teacherId}/rate`
    : `/login?redirectTo=${encodeURIComponent(`/teachers/${teacherId}/rate`)}`;

  return (
    <main className="min-h-screen bg-white">
      <Header heyName={heyName} isAuthed={isAuthed} active="teachers" showSearch />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {searchParams?.error ? (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{searchParams.error}</div>
        ) : null}

        {/* TOP GRID */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT PANEL */}
          <section>
            <div className="flex items-start gap-4">
              <div className="flex items-end gap-3">
                <div className="text-7xl font-black leading-none">{fmt1(teacher.avg_quality)}</div>
                <div className="pb-3 text-lg font-semibold text-neutral-400">/ 5</div>
              </div>
            </div>

            <div className="mt-3 text-sm font-semibold text-neutral-800">
              Overall Quality Based on{" "}
              <span className="underline underline-offset-2 decoration-neutral-300">{teacher.review_count ?? 0} ratings</span>
            </div>

            <div className="mt-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-5xl font-extrabold tracking-tight">{teacher.full_name}</div>
                <div className="mt-3 text-sm text-neutral-800">
                  Teacher in the{" "}
                  <span className="font-semibold underline underline-offset-2">{teacher.subject ?? "—"}</span> department at{" "}
                  <span className="font-semibold underline underline-offset-2">BIPH</span>
                </div>
              </div>

              <button className="mt-2 rounded-lg p-2 hover:bg-neutral-100" aria-label="Bookmark" type="button">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-70">
                  <path
                    d="M6 3h12a1 1 0 011 1v18l-7-4-7 4V4a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-6">
              <div className="border-r pr-6">
                <div className="text-4xl font-black">{fmtPct(teacher.pct_would_take_again)}</div>
                <div className="mt-1 text-sm text-neutral-700">Would take again</div>
              </div>
              <div className="pl-6">
                <div className="text-4xl font-black">{fmt1(teacher.avg_difficulty)}</div>
                <div className="mt-1 text-sm text-neutral-700">Level of Difficulty</div>
              </div>
            </div>

            {/* Rate button (primary entry to rating page) */}
            <div className="mt-8 flex gap-4">
              <Link
                href={rateHref}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-10 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Rate <span className="ml-2">→</span>
              </Link>
            </div>

            {/* Top tags */}
            <div className="mt-10">
              <div className="text-lg font-semibold">{teacher.full_name}&apos;s Top Tags</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {topTags.length === 0 ? (
                  <div className="text-sm text-neutral-600">No tags yet.</div>
                ) : (
                  topTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-extrabold tracking-wide text-neutral-900"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <section className="rounded-2xl bg-neutral-50 p-6">
            <div className="text-lg font-semibold">Rating Distribution</div>

            <div className="mt-6 space-y-5">
              {[
                { label: "Awesome", score: 5 },
                { label: "Great", score: 4 },
                { label: "Good", score: 3 },
                { label: "OK", score: 2 },
                { label: "Awful", score: 1 },
              ].map(({ label, score }) => {
                const c = counts[score as 1 | 2 | 3 | 4 | 5] ?? 0;
                const pct = totalRatings > 0 ? (c / totalRatings) * 100 : 0;

                return (
                  <div key={score} className="grid grid-cols-[110px_1fr_44px] items-center gap-4">
                    <div className="text-sm text-neutral-800">
                      {label} <span className="font-semibold">{score}</span>
                    </div>
                    <div className="h-10 rounded bg-neutral-200">
                      <div className="h-10 rounded bg-blue-600" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right text-sm font-semibold text-neutral-900">{c}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* REVIEWS */}
        <section id="ratings" className="mt-14">
          <div className="text-lg font-semibold">{teacher.review_count ?? 0} Student Ratings</div>

          {/* Course filter */}
          <form action={`/teachers/${teacherId}#ratings`} method="get" className="mt-4 flex w-full max-w-sm items-center gap-2">
            <select
              name="course"
              defaultValue={selectedCourse || ""}
              className="h-11 w-44 rounded-xl border bg-white px-3 text-sm outline-none focus:ring"
            >
              <option value="">All courses</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button type="submit" className="h-11 rounded-xl border bg-white px-4 text-sm hover:bg-neutral-50">
              Apply
            </button>
          </form>

          {reviewsErr ? (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              Failed to load reviews: {reviewsErr.message}
            </div>
          ) : null}

          <div className="mt-6 space-y-6">
            {sortedReviews.length === 0 ? (
              <div className="rounded-2xl border bg-white p-8 text-sm text-neutral-700">No reviews yet.</div>
            ) : (
              sortedReviews.map((r) => {
                const key = String(r.id);
                const voteCounts = countsByReview.get(key) ?? { up: 0, down: 0 };
                const myVote = (myVoteByReview.get(key) ?? 0) as 1 | -1 | 0;

                return (
                  <div key={key} className="rounded-2xl border bg-white shadow-sm">
                    {/* ✅ UPDATED: make columns stretch + pin voting to bottom */}
                    <div className="flex items-stretch gap-6 p-6">
                      {/* left quality + difficulty boxes */}
                      <div className="w-28 shrink-0 text-center flex flex-col justify-between">
                        {/* QUALITY */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold tracking-wide text-neutral-700">QUALITY</div>
                          <div className={`mt-2 rounded-xl px-3 py-5 ${ratingClass(r.quality)}`}>
                            <div className="text-4xl font-extrabold leading-none">{fmt1(r.quality)}</div>
                          </div>
                        </div>
                      
                        {/* DIFFICULTY */}
                        <div className="mt-3">
                          <div className="text-xs font-semibold tracking-wide text-neutral-700">DIFFICULTY</div>
                          <div className="mt-2 rounded-xl bg-neutral-200 px-3 py-5 text-neutral-900">
                            <div className="text-4xl font-extrabold leading-none">{fmt1(r.difficulty)}</div>
                          </div>
                        </div>
                      </div>

                      {/* content */}
                      <div className="min-w-0 flex-1 flex flex-col">
                        {/* main content */}
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div className="text-sm font-extrabold tracking-wide text-neutral-900">
                              {r.course ? String(r.course).toUpperCase() : "—"}
                            </div>
                            <div className="text-sm text-neutral-500">{formatDate(r.created_at)}</div>
                          </div>

                          <div className="mt-2 text-sm text-neutral-800">
                            <span className="font-semibold">Would take again:</span> {r.would_take_again ? "Yes" : "No"}
                          </div>

                          {Array.isArray(r.tags) && r.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {r.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {r.comment ? <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-800">{r.comment}</p> : null}
                        </div>

                        {/* Vote area pinned to bottom */}
                        <div className="mt-auto pt-4">
                          <ReviewVoteButtons
                            teacherId={teacherId}
                            reviewId={key}
                            upvotes={voteCounts.up}
                            downvotes={voteCounts.down}
                            myVote={myVote}
                            isAuthed={isAuthed}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href={rateHref}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-10 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Rate this teacher <span className="ml-2">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
