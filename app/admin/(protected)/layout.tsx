// app/admin/(protected)/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
import Link from "next/link";
import AdminLink from "@/components/AdminLink";
import SubmitButton from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/admin/session";
import { adminLogout } from "@/lib/admin/actions";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <AdminLink
      href={href}
      className="block rounded-xl px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
    >
      {label}
    </AdminLink>
  );
}

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  // 任何 /admin/(protected) 下页面都会先校验管理员 cookie
  requireAdmin("/admin/teachers");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <AdminLink href="/admin/teachers" className="rounded bg-black px-2 py-1 text-xs font-black tracking-widest text-white">
                ADMIN
              </AdminLink>
              <Link href="/teachers" className="text-xs font-semibold text-neutral-600 hover:underline">
                View site →
              </Link>
            </div>

            <div className="mt-4 space-y-1">
              <NavItem href="/admin/accounts" label="Accounts" />
              <NavItem href="/admin/teachers" label="Teachers" />
              <NavItem href="/admin/reviews" label="Reviews" />
              <NavItem href="/admin/tickets" label="Tickets" />
            </div>

            <form action={adminLogout} className="mt-4">
              <SubmitButton
                pendingText="Logging out..."
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Logout
              </SubmitButton>
            </form>

            <div className="mt-3 text-xs text-neutral-500">
              Uses Service Role key on server.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
