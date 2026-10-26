import type { Metadata } from "next";
import { Flash } from "@/components/flash";
import { SnippetTable } from "@/components/snippet-table";
import { getLatestSnippets } from "@/lib/snippets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Home - SnippetBox" } };

export default function HomePage() {
  const snippets = getLatestSnippets();

  return (
    <>
      <Flash />
      <h2>Latest Snippets</h2>
      {snippets.length > 0 ? (
        <SnippetTable snippets={snippets} />
      ) : (
        <p>There&apos;s nothing to see here... yet!</p>
      )}
    </>
  );
}
