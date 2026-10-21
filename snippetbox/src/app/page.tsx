import type { Metadata } from "next";
import { HomePage } from "@/modules/snippets/client";

export const metadata: Metadata = { title: { absolute: "Home - Snippetbox" } };

export default function Page() {
  return <HomePage />;
}
