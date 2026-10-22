"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  return (
    <Link href={href} className={pathname === href ? "live" : undefined}>
      {label}
    </Link>
  );
}
