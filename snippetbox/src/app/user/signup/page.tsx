import type { Metadata } from "next";
import { SignupPage } from "@/modules/identity/client";

export const metadata: Metadata = { title: "Signup" };

export default function Page() {
  return <SignupPage />;
}
