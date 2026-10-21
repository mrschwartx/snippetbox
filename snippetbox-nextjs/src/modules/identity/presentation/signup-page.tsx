"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FieldError, FormErrors } from "@/shared/ui/field-error";
import { useFormSubmission } from "@/shared/ui/use-form-submission";
import { useIdentity } from "./identity-provider";

export function SignupPage() {
  const router = useRouter();
  const { gateway } = useIdentity();
  const { fieldErrors, nonFieldErrors, submitting, submit } =
    useFormSubmission();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(async () => {
      await gateway.signup({ name, email, password });
      router.push("/user/login");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors messages={nonFieldErrors} />
      <div>
        <label htmlFor="name">Name:</label>
        <FieldError message={fieldErrors.name} />
        <input
          id="name"
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
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
        <input type="submit" value="Signup" disabled={submitting} />
      </div>
    </form>
  );
}
