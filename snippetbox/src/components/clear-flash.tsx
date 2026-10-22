"use client";

import { useEffect } from "react";

export function ClearFlash() {
  useEffect(() => {
    document.cookie = "snippetbox_flash=; Max-Age=0; Path=/";
  }, []);

  return null;
}
