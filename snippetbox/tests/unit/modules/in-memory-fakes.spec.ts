import {
  InMemorySessionRepository,
  InMemorySnippetRepository,
  InMemoryUserRepository,
} from "@tests/support/in-memory";
import { sessionRepositoryContract } from "@tests/support/contracts/session-repository.contract";
import { snippetRepositoryContract } from "@tests/support/contracts/snippet-repository.contract";
import { userRepositoryContract } from "@tests/support/contracts/user-repository.contract";

userRepositoryContract("InMemoryUserRepository", () => new InMemoryUserRepository());

sessionRepositoryContract("InMemorySessionRepository", async () => ({
  repository: new InMemorySessionRepository(),
  userId: 1,
}));

snippetRepositoryContract("InMemorySnippetRepository", () => new InMemorySnippetRepository());
