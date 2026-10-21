import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppProviders, type ClientGateways } from "@/shell/app-providers";
import { createInProcessGateways } from "./in-process-gateways";
import type { TestWorld } from "./world";

export const renderWithApp = (
  world: TestWorld,
  ui: ReactElement,
  overrides: Partial<ClientGateways> = {},
) => {
  const gateways = { ...createInProcessGateways(world), ...overrides };
  const wrap = (node: ReactElement) => (
    <AppProviders gateways={gateways}>{node}</AppProviders>
  );
  const view = render(wrap(ui));
  return { ...view, rerenderApp: (node: ReactElement) => view.rerender(wrap(node)) };
};

export { createInProcessGateways };
