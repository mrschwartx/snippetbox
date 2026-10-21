import { describe, expect, it } from "vitest";
import { DuplicateEmailError } from "@/modules/identity/domain/errors";
import type { NewUser } from "@/modules/identity/domain/user";
import type { UserRepository } from "@/modules/identity/domain/user-repository";

const newUser: NewUser = {
  name: "Alice",
  email: "alice@example.com",
  passwordHash: "hash",
  created: "2026-10-15T00:00:00.000Z",
};

export const userRepositoryContract = (
  name: string,
  create: () => UserRepository,
) => {
  describe(`${name} honours the UserRepository contract`, () => {
    it("assigns incrementing ids and returns the stored user", async () => {
      const repository = create();
      const first = await repository.insert(newUser);
      const second = await repository.insert({ ...newUser, email: "bob@example.com" });

      expect([first.id, second.id]).toEqual([1, 2]);
      expect(first.name).toBe("Alice");
      expect(first.passwordHash).toBe("hash");
    });

    it("finds users by id and by email", async () => {
      const repository = create();
      const user = await repository.insert(newUser);

      expect((await repository.findById(user.id))?.email).toBe("alice@example.com");
      expect((await repository.findByEmail("alice@example.com"))?.id).toBe(user.id);
    });

    it("returns null for unknown users", async () => {
      const repository = create();
      expect(await repository.findById(99)).toBeNull();
      expect(await repository.findByEmail("nobody@example.com")).toBeNull();
    });

    it("matches emails case insensitively", async () => {
      const repository = create();
      const user = await repository.insert(newUser);
      expect((await repository.findByEmail("ALICE@Example.com"))?.id).toBe(user.id);
    });

    it("rejects a duplicate email regardless of case", async () => {
      const repository = create();
      await repository.insert(newUser);

      await expect(repository.insert(newUser)).rejects.toBeInstanceOf(DuplicateEmailError);
      await expect(
        repository.insert({ ...newUser, email: "ALICE@example.com" }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);
    });
  });
};
