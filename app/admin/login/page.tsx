// app/admin/login/page.tsx
import SubmitButton from "@/components/SubmitButton";
import { adminLogin } from "@/lib/admin/actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string; next?: string };
}) {
  const next = (searchParams?.next ?? "").trim();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-md px-4 py-14">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold text-neutral-500">RMT Admin</div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Admin Login</h1>

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

          <form action={adminLogin} className="mt-6 space-y-3">
            <input type="hidden" name="next" value={next} />

            <div>
              <div className="text-xs font-semibold text-neutral-600">Username</div>
              <input
                name="username"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-neutral-600">Password</div>
              <input
                name="password"
                type="password"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                placeholder="••••••••"
                required
              />
            </div>

            <SubmitButton
              pendingText="Signing in..."
              className="w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Sign in
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}
