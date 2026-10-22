import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SnippetTable } from "@/components/snippet-table";

const make = (id: number, title: string) => ({
  id,
  title,
  content: "c",
  created: "2026-10-22T04:05:00.000Z",
  expires: "2026-10-29T04:05:00.000Z",
});

describe("SnippetTable", () => {
  it("renders the column headers", () => {
    render(<SnippetTable snippets={[make(1, "One")]} />);
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Title", "Created", "ID"]);
  });

  it("renders one body row per snippet in order", () => {
    render(<SnippetTable snippets={[make(3, "Three"), make(2, "Two"), make(1, "One")]} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Three")).toBeInTheDocument();
    expect(within(rows[2]).getByText("One")).toBeInTheDocument();
  });

  it("links each title to the snippet page", () => {
    render(<SnippetTable snippets={[make(42, "Answer")]} />);
    expect(screen.getByRole("link", { name: "Answer" })).toHaveAttribute("href", "/snippet/view/42");
  });

  it("shows the formatted date and id", () => {
    render(<SnippetTable snippets={[make(42, "Answer")]} />);
    expect(screen.getByText("22 Oct 2026 at 04:05")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("renders only the header for an empty list", () => {
    render(<SnippetTable snippets={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
