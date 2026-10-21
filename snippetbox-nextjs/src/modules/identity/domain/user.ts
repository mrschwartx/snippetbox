export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created: string;
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  created: string;
}

export class User {
  constructor(
    readonly id: number,
    readonly name: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly created: string,
  ) {}

  toProfile(): UserProfile {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      created: this.created,
    };
  }
}
