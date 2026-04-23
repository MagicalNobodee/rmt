export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-black"
            />
            <div>
              <div className="text-xs font-semibold text-neutral-500">RMT Admin</div>
              <div className="mt-1 text-sm font-extrabold text-neutral-950">Loading admin...</div>
            </div>
          </div>

          <div className="mt-6 space-y-3 animate-pulse" aria-label="Loading admin page">
            <div className="h-4 w-24 rounded-full bg-neutral-200" />
            <div className="h-10 rounded-xl bg-neutral-100" />
            <div className="h-4 w-28 rounded-full bg-neutral-200" />
            <div className="h-10 rounded-xl bg-neutral-100" />
            <div className="h-10 rounded-xl bg-neutral-900/15" />
          </div>
        </div>
      </div>
    </main>
  );
}
