export default function AdminProtectedLoading() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-black"
        />
        <div>
          <div className="text-xs font-semibold text-neutral-500">Admin</div>
          <div className="mt-1 text-sm font-extrabold text-neutral-950">Loading workspace...</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 animate-pulse" aria-label="Loading admin content">
        <div className="h-5 w-36 rounded-full bg-neutral-200" />
        <div className="h-12 rounded-xl bg-neutral-100" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
        </div>
        <div className="mt-2 space-y-2">
          <div className="h-14 rounded-xl bg-neutral-100" />
          <div className="h-14 rounded-xl bg-neutral-100" />
          <div className="h-14 rounded-xl bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
