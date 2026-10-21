import { describe, expect, it } from "vitest";
import { Session } from "@/modules/identity/domain/session";
import type { SessionRepository } from "@/modules/identity/domain/session-repository";

interface SessionFixture {
  repository: SessionRepository;
  userId: number;
}

const at = (iso: string) => new Date(iso);

export const sessionRepositoryContract = (
  name: string,
  create: () => Promise<SessionFixture>,
) => {
  describe(`${name} honours the SessionRepository contract`, () => {
    it("saves and finds a session by its token hash", async () => {
      const { repository, userId } = await create();
      const expiresAt = at("2026-10-16T00:00:00.000Z");
      await repository.save(Session.restore("hash-1", userId, expiresAt));

      const found = await repository.findByTokenHash("hash-1");
      expect(found?.userId).toBe(userId);
      expect(found?.expiresAt).toEqual(expiresAt);
    });

    it("returns null for an unknown hash", async () => {
      const { repository } = await create();
      expect(await repository.findByTokenHash("missing")).toBeNull();
    });

    it("overwrites a session saved twice under the same hash", async () => {
      const { repository, userId } = await create();
      await repository.save(Session.restore("hash-1", userId, at("2026-10-16T00:00:00.000Z")));
      await repository.save(Session.restore("hash-1", userId, at("2026-10-17T00:00:00.000Z")));

      const found = await repository.findByTokenHash("hash-1");
      expect(found?.expiresAt).toEqual(at("2026-10-17T00:00:00.000Z"));
    });

    it("deletes a session by its token hash only", async () => {
      const { repository, userId } = await create();
      await repository.save(Session.restore("hash-1", userId, at("2026-10-16T00:00:00.000Z")));
      await repository.save(Session.restore("hash-2", userId, at("2026-10-16T00:00:00.000Z")));

      await repository.deleteByTokenHash("hash-1");

      expect(await repository.findByTokenHash("hash-1")).toBeNull();
      expect(await repository.findByTokenHash("hash-2")).not.toBeNull();
    });

    it("deletes sessions that expire at or before the given instant", async () => {
      const { repository, userId } = await create();
      await repository.save(Session.restore("past", userId, at("2026-10-15T07:00:00.000Z")));
      await repository.save(Session.restore("boundary", userId, at("2026-10-15T08:00:00.000Z")));
      await repository.save(Session.restore("future", userId, at("2026-10-15T09:00:00.000Z")));

      await repository.deleteExpired(at("2026-10-15T08:00:00.000Z"));

      expect(await repository.findByTokenHash("past")).toBeNull();
      expect(await repository.findByTokenHash("boundary")).toBeNull();
      expect(await repository.findByTokenHash("future")).not.toBeNull();
    });
  });
};
