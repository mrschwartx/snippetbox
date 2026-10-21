"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SnippetsGateway } from "../application/snippets-gateway";

const SnippetsContext = createContext<SnippetsGateway | null>(null);

interface SnippetsProviderProps {
  gateway: SnippetsGateway;
  children: ReactNode;
}

export function SnippetsProvider({ gateway, children }: SnippetsProviderProps) {
  return (
    <SnippetsContext.Provider value={gateway}>{children}</SnippetsContext.Provider>
  );
}

export function useSnippetsGateway(): SnippetsGateway {
  const gateway = useContext(SnippetsContext);
  if (!gateway) {
    throw new Error("useSnippetsGateway must be used inside SnippetsProvider");
  }
  return gateway;
}
