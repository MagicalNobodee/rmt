import { Suspense } from "react";
import AdminRouteTransition from "@/components/AdminRouteTransition";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AdminRouteTransition />
      </Suspense>
      {children}
    </>
  );
}
