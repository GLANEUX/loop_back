import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
    authService = moduleRef.get(AuthService);
  });

  it("rejects invalid register payload", async () => {
    const request = { headers: {}, ip: "1.1.1.1" } as Request;
    await expect(controller.register({ email: "nope" }, request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("registers with valid payload", async () => {
    authService.register.mockResolvedValueOnce({ accessToken: "token" } as any);
    const request = { headers: { "user-agent": "jest" }, ip: "1.1.1.1" } as Request;

    const result = await controller.register(
      { email: "test@loop.local", pseudo: "ada", password: "Test1234!" },
      request,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(authService.register).toHaveBeenCalledWith(
      "test@loop.local",
      "ada",
      "Test1234!",
      "user",
      {
        userAgent: "jest",
        ip: "1.1.1.1",
      },
    );
    expect(result).toEqual({ accessToken: "token" });
  });

  it("rejects invalid login payload", async () => {
    const request = { headers: {}, ip: "1.1.1.1" } as Request;
    await expect(controller.login({ email: "nope" }, request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("logs in with valid payload", async () => {
    authService.login.mockResolvedValueOnce({ accessToken: "token" } as any);
    const request = { headers: { "user-agent": "jest" }, ip: "1.1.1.1" } as Request;

    const result = await controller.login(
      { email: "test@loop.local", password: "Test1234!" },
      request,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(authService.login).toHaveBeenCalledWith("test@loop.local", "Test1234!", {
      userAgent: "jest",
      ip: "1.1.1.1",
    });
    expect(result).toEqual({ accessToken: "token" });
  });

  it("logs out when sessionId is present", async () => {
    const request = { sessionId: "session-1" } as Request;
    const result = await controller.logout(request);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(authService.logout).toHaveBeenCalledWith("session-1");
    expect(result).toEqual({ ok: true });
  });

  it("rejects invalid change password payload", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(
      controller.changePassword({ oldPassword: "short", newPassword: "Test1234!" }, request),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("changes password with valid payload", async () => {
    authService.changePassword.mockResolvedValueOnce({ ok: true } as any);
    const request = { user: { id: "user-1" } } as Request;

    const result = await controller.changePassword(
      { oldPassword: "OldPass123!", newPassword: "NewPass123!" },
      request,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(authService.changePassword).toHaveBeenCalledWith(
      "user-1",
      "OldPass123!",
      "NewPass123!",
    );
    expect(result).toEqual({ ok: true });
  });
});
