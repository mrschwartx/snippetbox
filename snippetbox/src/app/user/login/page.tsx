import type { Metadata } from "next";
import { Flash } from "@/components/flash";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <>
      <Flash />
      <LoginForm />
    </>
  );
}
