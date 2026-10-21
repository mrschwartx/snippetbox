"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFlashGateway } from "./flash-provider";

export function FlashMessage() {
  const pathname = usePathname();
  const gateway = useFlashGateway();
  const [message, setMessage] = useState<string | null>(null);
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    const navigated = lastPathname.current !== pathname;
    lastPathname.current = pathname;

    void gateway.pop().then((popped) => {
      if (popped !== null) setMessage(popped);
      else if (navigated) setMessage(null);
    });
  }, [pathname, gateway]);

  if (!message) return null;
  return (
    <div className="flash" role="status">
      {message}
    </div>
  );
}
