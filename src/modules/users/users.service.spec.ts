import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
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
import { UsersService } from "./users.service";
import { ProfileMedia, ProfileMediaType } from "./profile-media.entity";

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;
  let genreRepo: jest.Mocked<Repository<GenreEntity>>;
  let instrumentRepo: jest.Mocked<Repository<InstrumentEntity>>;
  let profileGenreRepo: jest.Mocked<Repository<ProfileGenre>>;
  let profileInstrumentRepo: jest.Mocked<Repository<ProfileInstrument>>;
  let profileMediaRepo: jest.Mocked<Repository<ProfileMedia>>;
  let socialLinkRepo: jest.Mocked<Repository<SocialLink>>;

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
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    profileRepo = moduleRef.get(getRepositoryToken(Profile));
    genreRepo = moduleRef.get(getRepositoryToken(GenreEntity));
    instrumentRepo = moduleRef.get(getRepositoryToken(InstrumentEntity));
    profileGenreRepo = moduleRef.get(getRepositoryToken(ProfileGenre));
    profileInstrumentRepo = moduleRef.get(getRepositoryToken(ProfileInstrument));
    profileMediaRepo = moduleRef.get(getRepositoryToken(ProfileMedia));
    socialLinkRepo = moduleRef.get(getRepositoryToken(SocialLink));
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
      expect(profileMediaRepo.delete).toHaveBeenCalledWith("old-m"); // Physical cleanup
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
      expect(profileMediaRepo.delete).toHaveBeenCalledWith("m1");
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
});
