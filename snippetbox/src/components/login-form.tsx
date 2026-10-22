"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { initialFormState } from "@/lib/form";
import { Field, FormError } from "./field";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialFormState);

  return (
    <form action={action}>
      <FormError message={state.formError} />
      <Field label="Email" name="email" type="email" error={state.errors.email} defaultValue={state.values.email} />
      <Field label="Password" name="password" type="password" error={state.errors.password} />
      <div>
        <input type="submit" value="Login" disabled={pending} />
      </div>
    </form>
  );
}
