"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RecordNotFoundError } from "@/shared/kernel/errors";
import type { SnippetDto } from "../domain/snippet";
import { SnippetCard } from "./snippet-card";
import { useSnippetsGateway } from "./snippets-provider";

type ViewState =
  | { status: "loading" }
  | { status: "found"; snippet: SnippetDto }
  | { status: "missing" }
  | { status: "failed" };

export function SnippetViewPage() {
  const gateway = useSnippetsGateway();
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    const id = /^\d+$/.test(params.id) ? Number(params.id) : Number.NaN;

    gateway
      .get(id)
      .then((snippet) => setState({ status: "found", snippet }))
      .catch((error: unknown) =>
        setState({
          status: error instanceof RecordNotFoundError ? "missing" : "failed",
        }),
      );
  }, [gateway, params.id]);

  switch (state.status) {
    case "loading":
      return null;
    case "found":
      return <SnippetCard snippet={state.snippet} />;
    case "missing":
      return <p>Not Found</p>;
    case "failed":
      return <div className="error">Something went wrong. Please try again.</div>;
  }
}
