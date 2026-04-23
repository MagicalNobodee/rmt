import Link from "next/link";
import type { ComponentProps } from "react";

type AdminLinkProps = ComponentProps<typeof Link>;

export default function AdminLink(props: AdminLinkProps) {
  return <Link {...props} prefetch={false} />;
}
