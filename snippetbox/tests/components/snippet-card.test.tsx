import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SnippetCard } from "@/components/snippet-card";

const snippet = {
  id: 7,
  title: "An old silent pond",
  content: "line one\nline two",
  created: "2026-10-22T04:05:00.000Z",
  expires: "2026-10-29T04:05:00.000Z",
};

describe("SnippetCard", () => {
  it("shows the title and id", () => {
    render(<SnippetCard snippet={snippet} />);
    expect(screen.getByText("An old silent pond")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  it("renders the content inside pre and code", () => {
    const { container } = render(<SnippetCard snippet={snippet} />);
    const code = container.querySelector("pre > code");
    expect(code?.textContent).toBe("line one\nline two");
  });

  it("shows formatted created and expiry dates with machine readable values", () => {
    render(<SnippetCard snippet={snippet} />);
    const created = screen.getByText("Created: 22 Oct 2026 at 04:05");
    const expires = screen.getByText("Expires: 29 Oct 2026 at 04:05");
    expect(created).toHaveAttribute("datetime", snippet.created);
    expect(expires).toHaveAttribute("datetime", snippet.expires);
  });

  it("escapes markup in the title and content", () => {
    const { container } = render(
      <SnippetCard snippet={{ ...snippet, title: "<img src=x onerror=alert(1)>", content: "<script>alert(1)</script>" }} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("code")?.textContent).toBe("<script>alert(1)</script>");
  });
});
