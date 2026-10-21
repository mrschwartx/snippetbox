import type { Metadata } from "next";
import { SnippetCreatePage } from "@/modules/snippets/client";

export const metadata: Metadata = { title: "Create a New Snippet" };

export default function Page() {
  return <SnippetCreatePage />;
}
