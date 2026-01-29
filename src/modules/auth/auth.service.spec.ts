import { HttpException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersService } from "../users/users.service";
import { UserRole } from "../users/user-role.enum";
import * as authUtils from "./auth.utils";
import { AuthService } from "./auth.service";
import { RateLimitService } from "./rate-limit.service";
import { Session } from "./session.entity";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let sessionRepo: jest.Mocked<Repository<Session>>;
  let rateLimitService: jest.Mocked<RateLimitService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            hit: jest.fn(),
            isLimited: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    rateLimitService = moduleRef.get(RateLimitService);
    sessionRepo = moduleRef.get(getRepositoryToken(Session));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("blocks registration when rate limit is hit", async () => {
    rateLimitService.hit.mockReturnValueOnce({ count: 5, resetAt: Date.now(), allowed: false });

    await expect(
      service.register("test@loop.local", "ada", "password123", UserRole.User, {
        ip: "1.1.1.1",
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("registers and creates a session", async () => {
    rateLimitService.hit.mockReturnValueOnce({ count: 1, resetAt: Date.now(), allowed: true });
    usersService.createUser.mockResolvedValueOnce({
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      password: "hashed",
      role: UserRole.User,
    } as any);

    jest.spyOn(authUtils, "hashPassword").mockReturnValueOnce("hashed");
    jest.spyOn(authUtils, "generateSessionToken").mockReturnValueOnce("raw-token");
    jest.spyOn(authUtils, "hashToken").mockReturnValueOnce("hashed-token");

    sessionRepo.create.mockReturnValueOnce({
      id: "session-1",
    } as Session);
    sessionRepo.save.mockResolvedValueOnce({} as Session);

    const result = await service.register(
      "test@loop.local",
      "ada",
      "password123",
      UserRole.User,
      {
        ip: "1.1.1.1",
      },
    );

    expect(result.accessToken).toBe("raw-token");
    expect(result.user).toEqual({
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      role: UserRole.User,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usersService.createUser).toHaveBeenCalledWith(
      "test@loop.local",
      "ada",
      "hashed",
      UserRole.User,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", token: "hashed-token" }),
    );
  });

  it("blocks login when IP limit is exceeded", async () => {
    rateLimitService.isLimited.mockReturnValueOnce(true);

    await expect(
      service.login("test@loop.local", "password123", { ip: "1.1.1.1" }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("rejects login with missing user and counts attempts", async () => {
    rateLimitService.isLimited.mockReturnValue(false);
    usersService.findByEmail.mockResolvedValueOnce(null);

    await expect(
      service.login("test@loop.local", "password123", { ip: "1.1.1.1" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rateLimitService.hit).toHaveBeenCalled();
  });

  it("rejects login with wrong password and counts attempts", async () => {
    rateLimitService.isLimited.mockReturnValue(false);
    usersService.findByEmail.mockResolvedValueOnce({
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      password: "hashed",
      role: UserRole.User,
    } as any);
    jest.spyOn(authUtils, "verifyPassword").mockReturnValueOnce(false);

    await expect(
      service.login("test@loop.local", "password123", { ip: "1.1.1.1" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rateLimitService.hit).toHaveBeenCalled();
  });

  it("logs in successfully and resets limits", async () => {
    rateLimitService.isLimited.mockReturnValue(false);
    usersService.findByEmail.mockResolvedValueOnce({
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      password: "hashed",
      role: UserRole.User,
    } as any);
    jest.spyOn(authUtils, "verifyPassword").mockReturnValueOnce(true);
    jest.spyOn(authUtils, "generateSessionToken").mockReturnValueOnce("raw-token");
    jest.spyOn(authUtils, "hashToken").mockReturnValueOnce("hashed-token");

    sessionRepo.create.mockReturnValueOnce({ id: "session-1" } as Session);
    sessionRepo.save.mockResolvedValueOnce({} as Session);

    const result = await service.login("test@loop.local", "password123", { ip: "1.1.1.1" });

    expect(result.accessToken).toBe("raw-token");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(rateLimitService.reset).toHaveBeenCalled();
  });
});
