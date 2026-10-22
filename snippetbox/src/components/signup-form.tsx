"use client";

import { useActionState } from "react";
import { signupAction } from "@/actions/auth";
import { initialFormState } from "@/lib/form";
import { Field, FormError } from "./field";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialFormState);

  return (
    <form action={action}>
      <FormError message={state.formError} />
      <Field label="Name" name="name" error={state.errors.name} defaultValue={state.values.name} />
      <Field label="Email" name="email" type="email" error={state.errors.email} defaultValue={state.values.email} />
      <Field label="Password" name="password" type="password" error={state.errors.password} />
      <div>
        <input type="submit" value="Signup" disabled={pending} />
      </div>
    </form>
  );
}
