"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getYear = () => new Date().getFullYear();
const getServerYear = () => null;

export function SiteFooter() {
  const year = useSyncExternalStore(subscribe, getYear, getServerYear);

  return (
    <footer>
      Powered by <a href="https://nextjs.org/">Next.js</a>
      {year ? ` in ${year}` : ""}
    </footer>
  );
}
