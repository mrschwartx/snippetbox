"use client";

import { useActionState } from "react";
import { createSnippetAction } from "@/actions/snippets";
import { EXPIRY_OPTIONS } from "@/lib/expiry";
import { initialFormState } from "@/lib/form";
import { Field, FormError } from "./field";

export function SnippetForm() {
  const [state, action, pending] = useActionState(createSnippetAction, initialFormState);
  const selected = state.values.expires || "365";

  return (
    <form action={action}>
      <FormError message={state.formError} />
      <Field label="Title" name="title" error={state.errors.title} defaultValue={state.values.title} />
      <div>
        <label htmlFor="content">Content:</label>
        {state.errors.content && <label className="error">{state.errors.content}</label>}
        <textarea id="content" name="content" defaultValue={state.values.content} />
      </div>
      <div>
        <label>Delete in:</label>
        {state.errors.expires && <label className="error">{state.errors.expires}</label>}
        {EXPIRY_OPTIONS.map((option) => (
          <label className="choice" key={option.days}>
            <input
              type="radio"
              name="expires"
              value={option.days}
              defaultChecked={selected === String(option.days)}
            />{" "}
            {option.label}
          </label>
        ))}
      </div>
      <div>
        <input type="submit" value="Publish snippet" disabled={pending} />
      </div>
    </form>
  );
}
