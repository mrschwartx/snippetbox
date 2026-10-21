import type { NewUser, User } from "./user";

export interface UserRepository {
  insert(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
}
