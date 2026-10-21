export const PERMITTED_EXPIRES = [1, 7, 365] as const;

export type ExpiresInDays = (typeof PERMITTED_EXPIRES)[number];

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
