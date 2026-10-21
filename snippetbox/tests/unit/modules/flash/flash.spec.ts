import { beforeEach, expect } from "vitest";
import { PopFlash } from "@/modules/flash/application/pop-flash";
import { PushFlash } from "@/modules/flash/application/push-flash";
import { feature, given, scenario, thenExpect, when } from "@tests/support/bdd";
import { InMemoryFlashStore } from "@tests/support/in-memory";

feature("Flash messages", () => {
  let push: PushFlash;
  let pop: PopFlash;

  beforeEach(() => {
    const store = new InMemoryFlashStore();
    push = new PushFlash(store);
    pop = new PopFlash(store);
  });

  scenario("a pushed message can be read once", async () => {
    await given("a pending message", () => push.execute("hello"));

    await thenExpect("the first read returns it", async () => {
      expect(await pop.execute()).toBe("hello");
    });

    await thenExpect("the second read is empty", async () => {
      expect(await pop.execute()).toBeNull();
    });
  });

  scenario("only the latest message is kept", async () => {
    await given("two pushed messages", async () => {
      await push.execute("first");
      await push.execute("second");
    });

    await when("the message is read", async () => undefined);

    await thenExpect("the latest wins", async () => {
      expect(await pop.execute()).toBe("second");
    });
  });

  scenario("reading with nothing pending returns nothing", async () => {
    await thenExpect("null is returned", async () => {
      expect(await pop.execute()).toBeNull();
    });
  });
});
