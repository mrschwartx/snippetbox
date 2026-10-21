import type { Metadata } from "next";
import { LoginPage } from "@/modules/identity/client";

export const metadata: Metadata = { title: "Login" };

export default function Page() {
  return <LoginPage />;
}
