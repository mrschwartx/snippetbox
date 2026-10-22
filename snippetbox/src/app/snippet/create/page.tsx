import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SnippetForm } from "@/components/snippet-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create a New Snippet" };

export default async function CreateSnippetPage() {
  if (!(await getCurrentUser())) redirect("/user/login");
  return <SnippetForm />;
}
