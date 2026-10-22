import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClearFlash } from "@/components/clear-flash";
import { Flash } from "@/components/flash";
import { getFlash } from "@/lib/flash";

vi.mock("@/lib/flash", () => ({ getFlash: vi.fn() }));

beforeEach(() => {
  document.cookie = "snippetbox_flash=; Max-Age=0; Path=/";
});

describe("Flash", () => {
  it("renders nothing without a message", async () => {
    vi.mocked(getFlash).mockResolvedValue(null);
    const { container } = render(await Flash());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message as a status region", async () => {
    vi.mocked(getFlash).mockResolvedValue("Snippet successfully created!");
    render(await Flash());
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Snippet successfully created!");
    expect(status).toHaveClass("flash");
  });

  it("clears the flash cookie once displayed", async () => {
    document.cookie = "snippetbox_flash=hello; Path=/";
    expect(document.cookie).toContain("snippetbox_flash=hello");
    vi.mocked(getFlash).mockResolvedValue("hello");
    render(await Flash());
    expect(document.cookie).not.toContain("snippetbox_flash");
  });

  it("escapes markup in the message", async () => {
    vi.mocked(getFlash).mockResolvedValue("<b>bold</b>");
    const { container } = render(await Flash());
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("<b>bold</b>");
  });
});

describe("ClearFlash", () => {
  it("renders nothing and expires the cookie", () => {
    document.cookie = "snippetbox_flash=bye; Path=/";
    const { container } = render(<ClearFlash />);
    expect(container).toBeEmptyDOMElement();
    expect(document.cookie).not.toContain("snippetbox_flash");
  });

  it("leaves unrelated cookies alone", () => {
    document.cookie = "theme=dark; Path=/";
    render(<ClearFlash />);
    expect(document.cookie).toContain("theme=dark");
    document.cookie = "theme=; Max-Age=0; Path=/";
  });
});
