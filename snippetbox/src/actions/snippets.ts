"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EXPIRY_OPTIONS } from "@/lib/expiry";
import { setFlash } from "@/lib/flash";
import { createSnippet } from "@/lib/snippets";
import type { FormState } from "@/lib/form";

export async function createSnippetAction(_: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) redirect("/user/login");

  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const expires = String(formData.get("expires") ?? "");
  const values = { title, content, expires };
  const days = Number(expires);
  const errors: Record<string, string> = {};

  if (!title.trim()) errors.title = "This field cannot be blank";
  else if (Array.from(title).length > 100) {
    errors.title = "This field cannot be more than 100 characters long";
  }
  if (!content.trim()) errors.content = "This field cannot be blank";
  if (!EXPIRY_OPTIONS.some((option) => option.days === days)) {
    errors.expires = "This field must equal 1, 7 or 365";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  const id = createSnippet(title, content, days);
  await setFlash("Snippet successfully created!");
  redirect(`/snippet/view/${id}`);
}
