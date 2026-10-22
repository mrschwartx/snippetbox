import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { SnippetCard } from "@/components/snippet-card";
import { getSnippet } from "@/lib/snippets";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Snippet #${id}` };
}

export default async function SnippetPage({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const snippet = getSnippet(Number(id));
  if (!snippet) notFound();

  return (
    <>
      <Flash />
      <SnippetCard snippet={snippet} />
    </>
  );
}
