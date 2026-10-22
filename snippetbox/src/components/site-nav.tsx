import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { NavLink } from "./nav-link";

export async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <nav>
      <div>
        <NavLink href="/" label="Home" />
        {user && <NavLink href="/snippet/create" label="Create snippet" />}
      </div>
      <div>
        {user ? (
          <form action={logoutAction}>
            <button type="submit">Logout</button>
          </form>
        ) : (
          <>
            <NavLink href="/user/signup" label="Signup" />
            <NavLink href="/user/login" label="Login" />
          </>
        )}
      </div>
    </nav>
  );
}
