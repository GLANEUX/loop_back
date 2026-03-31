import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request, Response } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UserRole } from "./user-role.enum";
import { InstrumentLevel } from "./profile.enums";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: Record<keyof UsersService, jest.Mock>;

  beforeEach(async () => {
    const mockUsersService: Record<string, jest.Mock> = {
      softDeleteById: jest.fn(),
      findWithProfileById: jest.fn(),
      getProfileForUser: jest.fn(),
      updateProfileForUser: jest.fn(),
      updateAvatarForUser: jest.fn(),
      getAvatarForUser: jest.fn(),
      getAvatarForProfile: jest.fn(),
      listProfiles: jest.fn(),
      getProfileById: jest.fn(),
      updateEmailById: jest.fn(),
      updatePseudoById: jest.fn(),
      findByEmail: jest.fn(),
      findByPseudo: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      listGenres: jest.fn(),
      listInstruments: jest.fn(),
      addProfileMedia: jest.fn(),
      getProfileMedia: jest.fn(),
      deleteProfileMedia: jest.fn(),
      updatePasswordById: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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

    const mockUser = {
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      role: UserRole.User,
      profile: { id: "profile-1", isPublic: true },
      created_at: undefined,
      updated_at: undefined,
      deleted_at: null,
    };
    usersService.findWithProfileById.mockResolvedValueOnce(mockUser);

    const result = await controller.getMe(request);

    expect(result).toEqual(mockUser);
  });

  it("returns undefined when no authenticated user is present", async () => {
    const request = {} as Request;

    const result = await controller.getMe(request);

    expect(result).toBeUndefined();
  });

  it("returns base user for admins without profile", async () => {
    const request = { user: { id: "admin-1" } } as Request;
    const mockAdmin = {
      id: "admin-1",
      email: "admin@loop.local",
      role: UserRole.Admin,
      pseudo: "admin",
      created_at: undefined,
      updated_at: undefined,
      deleted_at: null,
    };
    usersService.findWithProfileById.mockResolvedValueOnce(mockAdmin);

    const result = await controller.getMe(request);

    expect(result).toEqual(mockAdmin);
  });

  it("soft deletes current user", async () => {
    const request = { user: { id: "user-1" } } as Request;
    const result = await controller.softDeleteMe(request);
    expect(usersService.softDeleteById).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ ok: true });
  });

  it("updates user email and pseudo", async () => {
    const request = { user: { id: "user-1" } } as Request;

    const result = await controller.updateMe(
      { email: "new@loop.local", pseudo: "NewPseudo" },
      request,
    );

    expect(usersService.updateEmailById).toHaveBeenCalledWith("user-1", "new@loop.local");
    expect(usersService.updatePseudoById).toHaveBeenCalledWith("user-1", "NewPseudo");
    expect(result).toEqual({ ok: true });
  });

  it("validates user update payloads", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(controller.updateMe({ email: "invalid-email" }, request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("validates profile update payloads", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(
      controller.updateMyProfile({ birthDate: "invalid-date" }, request),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns null when getting profile without a user", async () => {
    const request = {} as Request;

    const result = await controller.getMyProfile(request);

    expect(result).toBeNull();
  });

  it("accepts profile updates with genres and instruments", async () => {
    const request = { user: { id: "user-1" } } as Request;
    usersService.updateProfileForUser.mockResolvedValueOnce({ id: "profile-1" });

    const updateData = {
      genres: ["Rock", "Jazz"],
      instruments: [{ instrument: "Guitar", level: InstrumentLevel.Intermediate }],
    };

    await controller.updateMyProfile(updateData, request);

    expect(usersService.updateProfileForUser).toHaveBeenCalledWith("user-1", updateData);
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

    await expect(controller.listProfiles(request)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lists profiles for admins", async () => {
    const request = { user: { id: "admin-1", role: UserRole.Admin } } as Request;
    const mockProfiles = [{ id: "profile-1" }];
    usersService.listProfiles.mockResolvedValueOnce(mockProfiles);

    const result = await controller.listProfiles(request);

    expect(result).toEqual(mockProfiles);
  });

  it("returns null when updating profile without a user", async () => {
    const request = {} as Request;
    usersService.updateProfileForUser.mockResolvedValueOnce({ id: "profile-1" });

    const result = await controller.updateMyProfile({ firstName: "Ada" }, request);

    expect(result).toBeNull();
  });

  it("updates avatar for current user", async () => {
    const request = { user: { id: "user-1" } } as Request;
    usersService.updateAvatarForUser.mockResolvedValueOnce({ ok: true });

    const result = await controller.updateMyAvatar(
      { buffer: Buffer.from("fake") } as Express.Multer.File,
      request,
    );

    expect(usersService.updateAvatarForUser).toHaveBeenCalledWith("user-1", expect.any(Buffer));
    expect(result).toEqual({ ok: true });
  });

  it("rejects avatar update without file", async () => {
    const request = { user: { id: "user-1" } } as Request;

    await expect(controller.updateMyAvatar(undefined, request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("returns user avatar when available", async () => {
    const request = { user: { id: "user-1" } } as Request;
    const setHeader = jest.fn();
    const send = jest.fn();
    const response = {
      setHeader,
      send,
    } as unknown as Response;
    usersService.getAvatarForUser.mockResolvedValueOnce(Buffer.from("avatar"));

    await controller.getMyAvatar(request, response);

    expect(usersService.getAvatarForUser).toHaveBeenCalledWith("user-1");
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    expect(send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("returns profile avatar when available", async () => {
    const setHeader = jest.fn();
    const send = jest.fn();
    const response = {
      setHeader,
      send,
    } as unknown as Response;
    usersService.getAvatarForProfile.mockResolvedValueOnce(Buffer.from("avatar"));

    await controller.getProfileAvatar("profile-1", response);

    expect(usersService.getAvatarForProfile).toHaveBeenCalledWith("profile-1");
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    expect(send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("throws when profile avatar is missing", async () => {
    const setHeader = jest.fn();
    const send = jest.fn();
    const response = {
      setHeader,
      send,
    } as unknown as Response;
    usersService.getAvatarForProfile.mockResolvedValueOnce(null);

    await expect(controller.getProfileAvatar("profile-1", response)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns a specific profile", async () => {
    const mockProfile = { id: "profile-1", firstName: "Ada" };
    usersService.getProfileById.mockResolvedValueOnce(mockProfile);

    const result = await controller.getProfile("profile-1");

    expect(usersService.getProfileById).toHaveBeenCalledWith("profile-1");
    expect(result).toEqual(mockProfile);
  });

  it("accepts profile updates with localization and social links", async () => {
    const request = { user: { id: "user-1" } } as Request;
    usersService.updateProfileForUser.mockResolvedValueOnce({ id: "profile-1" });

    const updateData = {
      city: "Lyon",
      country: "France",
      lat: 45.764,
      lon: 4.8357,
      socialLinks: [{ platform: "instagram", url: "https://instagram.com/musician" }],
    };

    await controller.updateMyProfile(updateData, request);

    expect(usersService.updateProfileForUser).toHaveBeenCalledWith("user-1", updateData);
  });
});
