import { Reflector } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { GlobalThrottlerGuard } from "./global-throttler.guard";

describe("GlobalThrottlerGuard", () => {
  const makeContext = (path: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path }),
      }),
    }) as any;

  const createGuard = () => {
    const options = { throttlers: [{ ttl: 60, limit: 100 }] } as any;
    const storage = { increment: jest.fn() } as any;
    const reflector = new Reflector();
    return new GlobalThrottlerGuard(options, storage, reflector);
  };

  it("skips /health", async () => {
    const guard = createGuard();
    const result = await (guard as any).shouldSkip(makeContext("/health"));
    expect(result).toBe(true);
  });

  it("skips /docs", async () => {
    const guard = createGuard();
    const result = await (guard as any).shouldSkip(makeContext("/docs"));
    expect(result).toBe(true);
  });

  it("delegates to base guard for other routes", async () => {
    const baseSpy = jest
      .spyOn(ThrottlerGuard.prototype as any, "shouldSkip")
      .mockResolvedValueOnce(false);
    const guard = createGuard();
    const result = await (guard as any).shouldSkip(makeContext("/auth/login"));
    expect(result).toBe(false);
    baseSpy.mockRestore();
  });
});
