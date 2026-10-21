"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IdentityGateway } from "../application/identity-gateway";
import type { UserProfile } from "../domain/user";

interface IdentityContextValue {
  gateway: IdentityGateway;
  user: UserProfile | null;
  ready: boolean;
  refreshUser: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

interface IdentityProviderProps {
  gateway: IdentityGateway;
  children: ReactNode;
}

export function IdentityProvider({ gateway, children }: IdentityProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    setUser(await gateway.currentUser());
    setReady(true);
  }, [gateway]);

  useEffect(() => {
    let active = true;

    void gateway.currentUser().then((current) => {
      if (!active) return;
      setUser(current);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [gateway]);

  const value = useMemo(
    () => ({ gateway, user, ready, refreshUser }),
    [gateway, user, ready, refreshUser],
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext);
  if (!context) throw new Error("useIdentity must be used inside IdentityProvider");
  return context;
}
