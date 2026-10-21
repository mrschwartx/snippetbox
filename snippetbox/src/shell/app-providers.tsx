"use client";

import { useState, type ReactNode } from "react";
import {
  FlashProvider,
  createHttpFlashGateway,
  type FlashGateway,
} from "@/modules/flash/client";
import {
  IdentityProvider,
  createHttpIdentityGateway,
  type IdentityGateway,
} from "@/modules/identity/client";
import {
  SnippetsProvider,
  createHttpSnippetsGateway,
  type SnippetsGateway,
} from "@/modules/snippets/client";

export interface ClientGateways {
  identity: IdentityGateway;
  snippets: SnippetsGateway;
  flash: FlashGateway;
}

export const createHttpGateways = (): ClientGateways => ({
  identity: createHttpIdentityGateway(),
  snippets: createHttpSnippetsGateway(),
  flash: createHttpFlashGateway(),
});

interface AppProvidersProps {
  children: ReactNode;
  gateways?: ClientGateways;
}

export function AppProviders({ children, gateways }: AppProvidersProps) {
  const [resolved] = useState<ClientGateways>(
    () => gateways ?? createHttpGateways(),
  );

  return (
    <IdentityProvider gateway={resolved.identity}>
      <SnippetsProvider gateway={resolved.snippets}>
        <FlashProvider gateway={resolved.flash}>{children}</FlashProvider>
      </SnippetsProvider>
    </IdentityProvider>
  );
}
