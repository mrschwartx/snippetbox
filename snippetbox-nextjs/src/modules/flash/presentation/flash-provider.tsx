"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FlashGateway } from "../application/flash-gateway";

const FlashContext = createContext<FlashGateway | null>(null);

interface FlashProviderProps {
  gateway: FlashGateway;
  children: ReactNode;
}

export function FlashProvider({ gateway, children }: FlashProviderProps) {
  return <FlashContext.Provider value={gateway}>{children}</FlashContext.Provider>;
}

export function useFlashGateway(): FlashGateway {
  const gateway = useContext(FlashContext);
  if (!gateway) throw new Error("useFlashGateway must be used inside FlashProvider");
  return gateway;
}
