import { Injectable } from "@nestjs/common";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly store = new Map<string, RateLimitRecord>();
  private readonly cleanupIntervalMs = 60_000;

  constructor() {
    setInterval(() => this.cleanup(), this.cleanupIntervalMs).unref();
  }

  isLimited(key: string, max: number, windowMs: number): boolean {
    const record = this.getRecord(key, windowMs);
    return record.count >= max;
  }

  hit(key: string, max: number, windowMs: number): RateLimitRecord & { allowed: boolean } {
    const record = this.getRecord(key, windowMs);

    if (record.count >= max) {
      return { ...record, allowed: false };
    }

    record.count += 1;
    this.store.set(key, record);
    return { ...record, allowed: true };
  }

  reset(key: string) {
    this.store.delete(key);
  }

  private getRecord(key: string, windowMs: number): RateLimitRecord {
    const now = Date.now();
    const current = this.store.get(key);
    if (!current || current.resetAt <= now) {
      const fresh = { count: 0, resetAt: now + windowMs };
      this.store.set(key, fresh);
      return fresh;
    }

    return current;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
