import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

describe("AuthGuard", () => {
  const makeContext = (headers: Record<string, string> = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as any;

  it("rejects when token is missing", async () => {
    const authService = { validateSessionToken: jest.fn() } as unknown as AuthService;
    const guard = new AuthGuard(authService);

    await expect(guard.canActivate(makeContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when token is invalid", async () => {
    const authService = {
      validateSessionToken: jest.fn().mockResolvedValue(null),
    } as unknown as AuthService;
    const guard = new AuthGuard(authService);

    await expect(
      guard.canActivate(makeContext({ authorization: "Bearer bad-token" })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("accepts valid token and attaches user/session", async () => {
    const authService = {
      validateSessionToken: jest.fn().mockResolvedValue({
        sessionId: "session-1",
        user: { id: "user-1", email: "test@loop.local", pseudo: "ada", role: "user" },
        expiresAt: new Date(),
      }),
    } as unknown as AuthService;
    const guard = new AuthGuard(authService);

    const request: any = { headers: { authorization: "Bearer ok-token" } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "test@loop.local", pseudo: "ada", role: "user" });
    expect(request.sessionId).toBe("session-1");
  });
});
