"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdentity } from "./identity-provider";

export function useRequireAuth() {
  const { user, ready } = useIdentity();
  const router = useRouter();
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  if (user && !wasAuthenticated) setWasAuthenticated(true);

  useEffect(() => {
    if (ready && !user && !wasAuthenticated) router.replace("/user/login");
  }, [ready, user, wasAuthenticated, router]);

  return { user, ready, allowed: ready && user !== null };
}
