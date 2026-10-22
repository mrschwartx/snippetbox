"use server";

import { redirect } from "next/navigation";
import { checkCredentials, createUser, endSession, findUserByEmail, startSession } from "@/lib/auth";
import { setFlash } from "@/lib/flash";
import type { FormState } from "@/lib/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLANK = "This field cannot be blank";
const INVALID_EMAIL = "This field must be a valid email address";

const read = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function signupAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = {
    name: read(formData, "name"),
    email: read(formData, "email"),
    password: "",
  };
  const password = read(formData, "password");
  const errors: Record<string, string> = {};

  if (!values.name.trim()) errors.name = BLANK;
  if (!values.email.trim()) errors.email = BLANK;
  else if (!EMAIL_PATTERN.test(values.email)) errors.email = INVALID_EMAIL;
  if (!password.trim()) errors.password = BLANK;
  else if (password.length < 8) errors.password = "This field must be at least 8 characters long";

  if (!errors.email && findUserByEmail(values.email)) {
    errors.email = "Email address is already in use";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  await createUser(values.name, values.email, password);
  await setFlash("Your signup was successful. Please log in.");
  redirect("/user/login");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const values = { email: read(formData, "email"), password: "" };
  const password = read(formData, "password");
  const errors: Record<string, string> = {};

  if (!values.email.trim()) errors.email = BLANK;
  else if (!EMAIL_PATTERN.test(values.email)) errors.email = INVALID_EMAIL;
  if (!password.trim()) errors.password = BLANK;

  if (Object.keys(errors).length > 0) return { errors, values };

  const user = await checkCredentials(values.email, password);
  if (!user) return { errors, formError: "Email or password is incorrect", values };

  await startSession(user.id);
  redirect("/snippet/create");
}

export async function logoutAction() {
  await endSession();
  await setFlash("You've been logged out successfully!");
  redirect("/");
}
