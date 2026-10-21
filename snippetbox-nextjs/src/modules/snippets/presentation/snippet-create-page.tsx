"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useRequireAuth } from "@/modules/identity/client";
import { FieldError, FormErrors } from "@/shared/ui/field-error";
import { useFormSubmission } from "@/shared/ui/use-form-submission";
import { PERMITTED_EXPIRES } from "../domain/expiry";
import { useSnippetsGateway } from "./snippets-provider";

const EXPIRES_LABELS: Record<number, string> = {
  365: "One Year",
  7: "One Week",
  1: "One Day",
};

const DEFAULT_EXPIRES = 365;

export function SnippetCreatePage() {
  const router = useRouter();
  const gateway = useSnippetsGateway();
  const { allowed } = useRequireAuth();
  const { fieldErrors, nonFieldErrors, submitting, submit } =
    useFormSubmission();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expires, setExpires] = useState(DEFAULT_EXPIRES);

  if (!allowed) return null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(async () => {
      const snippet = await gateway.create({ title, content, expires });
      router.push(`/snippet/view/${snippet.id}`);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors messages={nonFieldErrors} />
      <div>
        <label htmlFor="title">Title:</label>
        <FieldError message={fieldErrors.title} />
        <input
          id="title"
          type="text"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="content">Content:</label>
        <FieldError message={fieldErrors.content} />
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      <div>
        <label>Delete in:</label>
        <FieldError message={fieldErrors.expires} />
        {[...PERMITTED_EXPIRES].reverse().map((days) => (
          <label className="choice" key={days}>
            <input
              type="radio"
              name="expires"
              value={days}
              checked={expires === days}
              onChange={() => setExpires(days)}
            />{" "}
            {EXPIRES_LABELS[days]}
          </label>
        ))}
      </div>
      <div>
        <input type="submit" value="Publish snippet" disabled={submitting} />
      </div>
    </form>
  );
}
