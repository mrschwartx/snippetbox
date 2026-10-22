import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Snippetbox", template: "%s - Snippetbox" },
  description: "Share short snippets of text and code.",
};

export const viewport: Viewport = { colorScheme: "light dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <h1>
            <Link href="/">Snippetbox</Link>
          </h1>
        </header>
        <SiteNav />
        <main>{children}</main>
        <footer>
          Powered by <a href="https://nextjs.org/">Next.js</a> in {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
