import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { SocialLink } from "./social-link.entity";
import { InstrumentLevel, SocialPlatform } from "./profile.enums";
import { UserRole } from "./user-role.enum";
import { User } from "./user.entity";
import { Block } from "./block.entity";
import { UsersService } from "./users.service";
import { ProfileMedia, ProfileMediaType } from "./profile-media.entity";
import { DiscoveryService } from "@modules/discovery/discovery.service";

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;
  let profileMediaRepo: jest.Mocked<Repository<ProfileMedia>>;
  let socialLinkRepo: jest.Mocked<Repository<SocialLink>>;
  let blockRepo: jest.Mocked<Repository<Block>>;
  let discoveryService: jest.Mocked<DiscoveryService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            merge: jest.fn((entity: object, updates: object) => ({ ...entity, ...updates })),
          },
        },
        {
          provide: getRepositoryToken(GenreEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InstrumentEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfileGenre),
          useValue: {
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfileInstrument),
          useValue: {
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfileMedia),
          useValue: {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SocialLink),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Block),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
          },
        },
        {
          provide: DiscoveryService,
          useValue: {
            removeMatch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    profileRepo = moduleRef.get(getRepositoryToken(Profile));
    profileMediaRepo = moduleRef.get(getRepositoryToken(ProfileMedia));
    socialLinkRepo = moduleRef.get(getRepositoryToken(SocialLink));
    blockRepo = moduleRef.get(getRepositoryToken(Block));
    discoveryService = moduleRef.get(DiscoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- EXISTING TESTS (ADAPTED) ---

  it("normalizes email in findByEmail", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    await service.findByEmail("  TEST@Loop.local ");
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { email: "test@loop.local" },
    });
  });

  it("formats profile genres and instruments when fetching user", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      profile: {
        id: "profile-1",
        avatarMediaId: null,
        genres: [{ genre: { name: "Rock" } }],
        instruments: [{ instrument: { name: "Guitar" }, level: InstrumentLevel.Intermediate }],
        media: [],
      },
    } as unknown as User);

    const result = await service.findWithProfileById("user-1");

    expect(result).toEqual(
      expect.objectContaining({
        id: "user-1",
        profile: expect.objectContaining({
          id: "profile-1",
          hasAvatar: false,
          genres: ["Rock"],
          instruments: [{ instrument: "Guitar", level: InstrumentLevel.Intermediate }],
          media: [],
        }),
      }),
    );
  });

  it("returns null when profile avatar is missing", async () => {
    profileRepo.findOne.mockResolvedValueOnce({ id: "p1", avatarMediaId: null } as Profile);
    const result = await service.getAvatarForProfile("p1");
    expect(result).toBeNull();
  });

  it("returns avatar media for public profiles", async () => {
    profileRepo.findOne.mockResolvedValueOnce({ id: "p1", avatarMediaId: "m1" } as Profile);
    profileMediaRepo.findOne.mockResolvedValueOnce({
      id: "m1",
      data: Buffer.from("data"),
    } as ProfileMedia);

    const result = await service.getAvatarForProfile("p1");

    expect(result).toEqual(expect.objectContaining({ id: "m1" }));
  });

  // --- NEW MEDIA & AVATAR TESTS ---

  describe("addProfileMedia", () => {
    it("uploads a new image and sets it as avatar", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1", avatarMediaId: "old-m" },
      } as any);
      profileMediaRepo.count.mockResolvedValueOnce(5);
      profileMediaRepo.create.mockReturnValueOnce({ id: "new-m" } as any);
      profileMediaRepo.save.mockResolvedValueOnce({
        id: "new-m",
        type: ProfileMediaType.Image,
      } as any);

      await service.addProfileMedia(
        "u1",
        Buffer.from("fake"),
        "image/png",
        ProfileMediaType.Image,
        "New Avatar",
        { isAvatar: true },
      );

      expect(profileRepo.update).toHaveBeenCalledWith("p1", { avatarMediaId: "new-m" });
      expect(profileMediaRepo.softDelete).toHaveBeenCalledWith("old-m"); // Physical cleanup
    });

    it("uploads a new audio and sets it as featured", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1" },
      } as any);
      profileMediaRepo.create.mockReturnValueOnce({ id: "new-a" } as any);
      profileMediaRepo.save.mockResolvedValueOnce({
        id: "new-a",
        type: ProfileMediaType.Audio,
      } as any);

      await service.addProfileMedia(
        "u1",
        Buffer.from("fake"),
        "audio/mpeg",
        ProfileMediaType.Audio,
        "Song",
        { isFeatured: true },
      );

      expect(profileRepo.update).toHaveBeenCalledWith("p1", { featuredAudioId: "new-a" });
    });
  });

  describe("setFeaturedAudio", () => {
    it("sets an existing audio as featured", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1" },
      } as any);
      profileMediaRepo.findOne.mockResolvedValueOnce({
        id: "m1",
        type: ProfileMediaType.Audio,
      } as any);

      await service.setFeaturedAudio("u1", "m1");

      expect(profileRepo.update).toHaveBeenCalledWith("p1", { featuredAudioId: "m1" });
    });

    it("throws error if audio doesn't exist or isn't an audio", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1" },
      } as any);
      profileMediaRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.setFeaturedAudio("u1", "m1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("listProfileMedia", () => {
    it("excludes avatar from image list", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1", avatarMediaId: "m-avatar" },
      } as any);
      profileMediaRepo.find.mockResolvedValueOnce([
        { id: "m-avatar", type: ProfileMediaType.Image },
        { id: "m-gallery", type: ProfileMediaType.Image },
      ] as any);

      const result = await service.listProfileMedia("u1", ProfileMediaType.Image);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("m-gallery");
    });
  });

  describe("deleteAvatar", () => {
    it("clears FK and deletes media record", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1", avatarMediaId: "m1" },
      } as any);

      await service.deleteAvatar("u1");

      expect(profileRepo.update).toHaveBeenCalledWith("p1", { avatarMediaId: null });
      expect(profileMediaRepo.softDelete).toHaveBeenCalledWith("m1");
    });
  });

  it("soft deletes a user by id", async () => {
    await service.softDeleteById("user-1");
    expect(userRepo.softDelete).toHaveBeenCalledWith("user-1");
  });

  it("updates a user's password hash by id", async () => {
    await service.updatePasswordById("user-1", "new-hash123!Palfklqsd");
    expect(userRepo.update).toHaveBeenCalledWith(
      { id: "user-1" },
      { password: "new-hash123!Palfklqsd" },
    );
  });

  describe("updateProfileForUser with localization and social links", () => {
    it("updates city, country, lat and lon", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1" },
      } as any);
      profileRepo.findOne.mockResolvedValueOnce({
        id: "p1",
        userId: "u1",
      } as any);

      await service.updateProfileForUser("u1", {
        city: "Paris",
        country: "France",
        lat: 48.8566,
        lon: 2.3522,
      });

      expect(profileRepo.merge).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          city: "Paris",
          country: "France",
          lat: 48.8566,
          lon: 2.3522,
        }),
      );
      expect(profileRepo.save).toHaveBeenCalled();
    });

    it("updates social links", async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: "u1",
        role: UserRole.User,
        profile: { id: "p1" },
      } as any);
      profileRepo.findOne.mockResolvedValueOnce({
        id: "p1",
        userId: "u1",
      } as any);
      socialLinkRepo.create.mockReturnValue({} as any);

      await service.updateProfileForUser("u1", {
        socialLinks: [{ platform: SocialPlatform.Instagram, url: "https://instagram.com/user" }],
      });

      expect(socialLinkRepo.delete).toHaveBeenCalledWith({ profileId: "p1" });
      expect(socialLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: SocialPlatform.Instagram,
          url: "https://instagram.com/user",
        }),
      );
      expect(socialLinkRepo.save).toHaveBeenCalled();
    });
  });

  describe("Blocking Logic", () => {
    it("blocks a user and breaks match", async () => {
      userRepo.findOne.mockResolvedValue({ id: "u1", profile: { id: "p1" } } as any);
      profileRepo.findOne.mockResolvedValue({ id: "p2" } as any);
      blockRepo.findOne.mockResolvedValue(null);
      blockRepo.create.mockReturnValue({ id: "b1" } as any);

      const result = await service.blockUser("u1", "p2");

      expect(result).toEqual({ ok: true });
      expect(blockRepo.save).toHaveBeenCalled();
      expect(discoveryService.removeMatch).toHaveBeenCalledWith("p1", "p2");
    });

    it("unblocks a user", async () => {
      userRepo.findOne.mockResolvedValue({ id: "u1", profile: { id: "p1" } } as any);
      blockRepo.findOne.mockResolvedValue({ id: "b1" } as any);

      const result = await service.unblockUser("u1", "p2");

      expect(result).toEqual({ ok: true });
      expect(blockRepo.softDelete).toHaveBeenCalledWith("b1");
    });

    it("checks if users are blocked (either way)", async () => {
      blockRepo.count.mockResolvedValueOnce(1);
      const result = await service.isBlocked("p1", "p2");
      expect(result).toBe(true);
      expect(blockRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { blockerProfileId: "p1", blockedProfileId: "p2" },
            { blockerProfileId: "p2", blockedProfileId: "p1" },
          ],
        }),
      );
    });

    it("gets all blocked profile IDs for a user", async () => {
      blockRepo.find.mockResolvedValue([
        { blockerProfileId: "p1", blockedProfileId: "p2" },
        { blockerProfileId: "p3", blockedProfileId: "p1" },
      ] as any);

      const result = await service.getBlockedProfileIds("p1");

      expect(result).toContain("p1");
      expect(result).toContain("p2");
      expect(result).toContain("p3");
      expect(result).toHaveLength(3);
    });

    it("lists blocked profiles with a blocked_at date, most recent first", async () => {
      userRepo.findOne.mockResolvedValue({ id: "u1", profile: { id: "p1" } } as any);
      const blockedAt = new Date("2026-06-10T10:00:00.000Z");
      blockRepo.find.mockResolvedValue([
        {
          createdAt: blockedAt,
          blockedProfile: { id: "p2", firstName: "Bob", user: { pseudo: "bob" } },
        },
      ] as any);

      const result = await service.listBlockedUsers("u1");

      expect(blockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { blockerProfileId: "p1" },
          order: { createdAt: "DESC" },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "p2", blocked_at: blockedAt });
    });

    it("filters blocked profiles by search term (name or pseudo)", async () => {
      userRepo.findOne.mockResolvedValue({ id: "u1", profile: { id: "p1" } } as any);
      blockRepo.find.mockResolvedValue([
        {
          createdAt: new Date(),
          blockedProfile: { id: "p2", firstName: "Alice", user: { pseudo: "alice" } },
        },
        {
          createdAt: new Date(),
          blockedProfile: { id: "p3", firstName: "Bob", user: { pseudo: "bobby" } },
        },
      ] as any);

      const result = await service.listBlockedUsers("u1", "bob");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("p3");
    });
  });
});
