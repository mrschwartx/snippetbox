"use client";

import { useEffect, useState } from "react";
import type { SnippetDto } from "../domain/snippet";
import { SnippetTable } from "./snippet-table";
import { useSnippetsGateway } from "./snippets-provider";

export function HomePage() {
  const gateway = useSnippetsGateway();
  const [snippets, setSnippets] = useState<SnippetDto[] | null>(null);

  useEffect(() => {
    void gateway.listLatest().then(setSnippets);
  }, [gateway]);

  return (
    <>
      <h2>Latest Snippets</h2>
      {snippets === null ? null : snippets.length > 0 ? (
        <SnippetTable snippets={snippets} />
      ) : (
        <p>There&apos;s nothing to see here... yet!</p>
      )}
    </>
  );
}
