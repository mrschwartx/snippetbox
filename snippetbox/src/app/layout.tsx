import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { FlashMessage } from "@/modules/flash/client";
import { AppProviders } from "@/shell/app-providers";
import { SiteFooter } from "@/shell/site-footer";
import { SiteHeader } from "@/shell/site-header";
import { SiteNav } from "@/shell/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Snippetbox", template: "%s - Snippetbox" },
  description: "Share short snippets of text and code.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <SiteHeader />
          <SiteNav />
          <main>
            <FlashMessage />
            {children}
          </main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
