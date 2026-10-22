import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Signup" };

export default function SignupPage() {
  return <SignupForm />;
}
