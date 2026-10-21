"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FieldError, FormErrors } from "@/shared/ui/field-error";
import { useFormSubmission } from "@/shared/ui/use-form-submission";
import { useIdentity } from "./identity-provider";

export function LoginPage() {
  const router = useRouter();
  const { gateway, refreshUser } = useIdentity();
  const { fieldErrors, nonFieldErrors, submitting, submit } =
    useFormSubmission();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(async () => {
      await gateway.login({ email, password });
      await refreshUser();
      router.push("/snippet/create");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors messages={nonFieldErrors} />
      <div>
        <label htmlFor="email">Email:</label>
        <FieldError message={fieldErrors.email} />
        <input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <FieldError message={fieldErrors.password} />
        <input
          id="password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <input type="submit" value="Login" disabled={submitting} />
      </div>
    </form>
  );
}
