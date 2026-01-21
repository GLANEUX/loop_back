import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows hits within the window", () => {
    const first = service.hit("key", 2, 1000);
    const second = service.hit("key", 2, 1000);
    const third = service.hit("key", 2, 1000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("resets after window passes", () => {
    service.hit("key", 1, 1000);
    expect(service.isLimited("key", 1, 1000)).toBe(true);

    jest.setSystemTime(new Date("2025-01-01T00:00:02.000Z"));
    expect(service.isLimited("key", 1, 1000)).toBe(false);
  });

  it("can reset a key manually", () => {
    service.hit("key", 1, 1000);
    service.reset("key");
    expect(service.isLimited("key", 1, 1000)).toBe(false);
  });
});
