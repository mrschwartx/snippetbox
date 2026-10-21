"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIdentity } from "@/modules/identity/client";

interface NavLinkProps {
  href: string;
  label: string;
  pathname: string;
}

function NavLink({ href, label, pathname }: NavLinkProps) {
  return (
    <Link href={href} className={pathname === href ? "live" : undefined}>
      {label}
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { gateway, user, ready, refreshUser } = useIdentity();

  const logout = async () => {
    await gateway.logout();
    await refreshUser();
    router.push("/");
  };

  return (
    <nav>
      <div>
        <NavLink href="/" label="Home" pathname={pathname} />
        {user && (
          <NavLink
            href="/snippet/create"
            label="Create snippet"
            pathname={pathname}
          />
        )}
      </div>
      <div>
        {ready && user && (
          <button type="button" onClick={logout}>
            Logout
          </button>
        )}
        {ready && !user && (
          <>
            <NavLink href="/user/signup" label="Signup" pathname={pathname} />
            <NavLink href="/user/login" label="Login" pathname={pathname} />
          </>
        )}
      </div>
    </nav>
  );
}
