import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UserRole } from "./user-role.enum";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            softDeleteById: jest.fn(),
            findWithProfileById: jest.fn(),
            getProfileForUser: jest.fn(),
            updateProfileForUser: jest.fn(),
            listProfiles: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = moduleRef.get(UsersController);
    usersService = moduleRef.get(UsersService);
  });

  it("returns current user with profile for role=user", async () => {
    const request = {
      user: { id: "user-1" },
    } as Request;

    usersService.findWithProfileById.mockResolvedValueOnce({
      id: "user-1",
      email: "test@loop.local",
      role: UserRole.User,
      firstName: "Ada",
      lastName: "Lovelace",
      profile: { id: "profile-1", displayName: "Ada Lovelace", isPublic: true },
    } as any);

    const result = await controller.getMe(request);

    expect(result).toEqual({
      id: "user-1",
      email: "test@loop.local",
      role: UserRole.User,
      firstName: "Ada",
      lastName: "Lovelace",
      profile: { id: "profile-1", displayName: "Ada Lovelace", isPublic: true },
    });
  });

  it("returns undefined when no authenticated user is present", async () => {
    const request = {} as Request;

    const result = await controller.getMe(request);

    expect(result).toBeUndefined();
  });

  it("returns base user for admins without profile", async () => {
    const request = { user: { id: "admin-1" } } as Request;
    usersService.findWithProfileById.mockResolvedValueOnce({
      id: "admin-1",
      email: "admin@loop.local",
      role: UserRole.Admin,
      firstName: "Admin",
      lastName: "User",
    } as any);

    const result = await controller.getMe(request);

    expect(result).toEqual({
      id: "admin-1",
      email: "admin@loop.local",
      role: UserRole.Admin,
      firstName: "Admin",
      lastName: "User",
    });
  });

  it("soft deletes current user", async () => {
    const request = { user: { id: "user-1" } } as Request;
    const result = await controller.softDeleteMe(request);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usersService.softDeleteById).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ ok: true });
  });

  it("validates profile update payloads", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(
      controller.updateMyProfile({ avatarUrl: "not-a-url" }, request),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns null when getting profile without a user", async () => {
    const request = {} as Request;

    const result = await controller.getMyProfile(request);

    expect(result).toBeNull();
  });

  it("accepts profile updates with genres and instruments", async () => {
    const request = { user: { id: "user-1" } } as Request;
    usersService.updateProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as any);

    await controller.updateMyProfile(
      {
        genres: ["Rock", "Jazz"],
        instruments: [{ instrument: "Guitar", level: "Intermediate" }],
      },
      request,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(usersService.updateProfileForUser).toHaveBeenCalledWith("user-1", {
      genres: ["Rock", "Jazz"],
      instruments: [{ instrument: "Guitar", level: "Intermediate" }],
    });
  });

  it("rejects invalid instrument level payloads", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(
      controller.updateMyProfile(
        {
          instruments: [{ instrument: "Guitar", level: "Master" }],
        },
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects non-admin access to list profiles", async () => {
    const request = { user: { id: "user-1", role: UserRole.User } } as Request;

    await expect(controller.listProfiles(request)).rejects.toHaveProperty(
      "message",
      "Admin only",
    );
  });

  it("lists profiles for admins", async () => {
    const request = { user: { id: "admin-1", role: UserRole.Admin } } as Request;
    usersService.listProfiles.mockResolvedValueOnce([{ id: "profile-1" }] as any);

    const result = await controller.listProfiles(request);

    expect(result).toEqual([{ id: "profile-1" }]);
  });

  it("returns null when updating profile without a user", async () => {
    const request = {} as Request;
    usersService.updateProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as any);

    const result = await controller.updateMyProfile({ displayName: "Ada" }, request);

    expect(result).toBeNull();
  });
});
