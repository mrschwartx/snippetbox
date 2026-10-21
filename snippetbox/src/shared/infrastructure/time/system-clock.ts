import type { Clock } from "@/shared/kernel/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
