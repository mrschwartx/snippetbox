import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavLink } from "@/components/nav-link";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/auth";

const pathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/actions/auth", () => ({ logoutAction: vi.fn() }));

beforeEach(() => {
  pathname.value = "/";
});

describe("NavLink", () => {
  it("renders a link to the target", () => {
    render(<NavLink href="/user/login" label="Login" />);
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/user/login");
  });

  it("marks the link live when it matches the current path", () => {
    pathname.value = "/user/login";
    render(<NavLink href="/user/login" label="Login" />);
    expect(screen.getByRole("link")).toHaveClass("live");
  });

  it("does not mark a different path as live", () => {
    pathname.value = "/";
    render(<NavLink href="/user/login" label="Login" />);
    expect(screen.getByRole("link")).not.toHaveClass("live");
  });

  it("requires an exact match", () => {
    pathname.value = "/snippet/create/extra";
    render(<NavLink href="/snippet/create" label="Create snippet" />);
    expect(screen.getByRole("link")).not.toHaveClass("live");
  });
});

describe("SiteNav", () => {
  it("shows signup and login to visitors", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    render(await SiteNav());
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Signup" })).toHaveAttribute("href", "/user/signup");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/user/login");
    expect(screen.queryByRole("link", { name: "Create snippet" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Logout" })).toBeNull();
  });

  it("shows create and logout to signed in users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, name: "Ada", email: "ada@example.com" });
    render(await SiteNav());
    expect(screen.getByRole("link", { name: "Create snippet" })).toHaveAttribute("href", "/snippet/create");
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Signup" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
  });

  it("highlights the current page", async () => {
    pathname.value = "/";
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    render(await SiteNav());
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass("live");
    expect(screen.getByRole("link", { name: "Login" })).not.toHaveClass("live");
  });
});
