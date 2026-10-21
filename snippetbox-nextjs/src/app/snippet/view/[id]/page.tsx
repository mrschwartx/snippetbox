import type { Metadata } from "next";
import { SnippetViewPage } from "@/modules/snippets/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Snippet #${id}` };
}

export default function Page() {
  return <SnippetViewPage />;
}
