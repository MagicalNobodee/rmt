"use client";

import { useEffect, useRef, useState } from "react";
import TeacherCard from "@/components/TeacherCard";
import type { TeacherListItem } from "@/types";

type TeachersInfiniteListProps = {
  initialTeachers: TeacherListItem[];
  initialCount: number;
  initialPage: number;
  pageSize: number;
  q: string;
  subject: string;
};

type TeachersApiResponse = {
  teachers?: TeacherListItem[];
  count?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  error?: string;
};

function mergeTeachers(current: TeacherListItem[], incoming: TeacherListItem[]) {
  const seen = new Set(current.map((teacher) => teacher.id));
  const merged = current.slice();

  for (const teacher of incoming) {
    if (seen.has(teacher.id)) continue;
    seen.add(teacher.id);
    merged.push(teacher);
  }

  return merged;
}

export default function TeachersInfiniteList({
  initialTeachers,
  initialCount,
  initialPage,
  pageSize,
  q,
  subject,
}: TeachersInfiniteListProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const hasMore = teachers.length < initialCount;

  useEffect(() => {
    setTeachers(initialTeachers);
    setPage(initialPage);
    setError(null);
    setIsLoading(false);
    isLoadingRef.current = false;
  }, [initialTeachers, initialPage, initialCount, q, subject]);

  async function loadNextPage() {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        ...(q ? { q } : {}),
        ...(subject ? { subject } : {}),
      });

      const response = await fetch(`/api/teachers?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as TeachersApiResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load more teachers.");
      }

      const nextTeachers = payload.teachers ?? [];
      setTeachers((current) => mergeTeachers(current, nextTeachers));
      setPage(payload.page ?? page + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load more teachers.";
      setError(message);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mt-6 space-y-5">
        {teachers.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-sm text-neutral-700">No teachers found.</div>
        ) : (
          teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
        )}
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <div>{error}</div>
          <button
            type="button"
            onClick={() => {
              void loadNextPage();
            }}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-medium hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      {teachers.length > 0 ? (
        <div className="mt-8 flex min-h-16 items-center justify-center">
          {hasMore ? (
            <button
              type="button"
              onClick={() => {
                void loadNextPage();
              }}
              disabled={isLoading}
              className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-500 disabled:hover:bg-white"
            >
              {isLoading ? "Loading..." : "Load more"}
            </button>
          ) : null}
          {!hasMore ? <div className="text-sm text-neutral-500">You&apos;ve reached the end.</div> : null}
        </div>
      ) : null}

      {teachers.length > 0 && initialCount > pageSize ? (
        <div className="mt-3 text-center text-xs text-neutral-500">
          Showing {teachers.length} of {initialCount} teachers
        </div>
      ) : null}
    </>
  );
}
