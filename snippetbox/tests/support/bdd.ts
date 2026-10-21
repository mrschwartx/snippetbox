import { describe, it } from "vitest";

type Step<T = unknown> = () => T | Promise<T>;

export const feature = (name: string, body: () => void) =>
  describe(`Feature: ${name}`, body);

export const scenario = (name: string, body: Step) =>
  it(`Scenario: ${name}`, async () => {
    await body();
  });

export const given = async <T>(_description: string, step: Step<T>) => step();

export const when = async <T>(_description: string, step: Step<T>) => step();

export const thenExpect = async <T>(_description: string, step: Step<T>) =>
  step();
