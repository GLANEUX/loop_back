import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { InstrumentLevel } from "./profile.enums";
import { UserRole } from "./user-role.enum";
import { User } from "./user.entity";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;
  let genreRepo: jest.Mocked<Repository<GenreEntity>>;
  let instrumentRepo: jest.Mocked<Repository<InstrumentEntity>>;
  let profileGenreRepo: jest.Mocked<Repository<ProfileGenre>>;
  let profileInstrumentRepo: jest.Mocked<Repository<ProfileInstrument>>;

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
            merge: jest.fn((entity, updates) => ({ ...entity, ...updates })),
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
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    profileRepo = moduleRef.get(getRepositoryToken(Profile));
    genreRepo = moduleRef.get(getRepositoryToken(GenreEntity));
    instrumentRepo = moduleRef.get(getRepositoryToken(InstrumentEntity));
    profileGenreRepo = moduleRef.get(getRepositoryToken(ProfileGenre));
    profileInstrumentRepo = moduleRef.get(getRepositoryToken(ProfileInstrument));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes email in findByEmail", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    await service.findByEmail("  TEST@Loop.local ");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { email: "test@loop.local" },
    });
  });

  it("throws conflict when email already exists", async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: "user-1" } as User);

    await expect(
      service.createUser("test@loop.local", "ada", "hashed"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("finds a user by id", async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: "user-1" } as User);

    const result = await service.findById("user-1");

    expect(result).toEqual({ id: "user-1" });
  });

  it("returns null when findWithProfileById cannot find a user", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    const result = await service.findWithProfileById("missing");

    expect(result).toBeNull();
  });

  it("formats profile genres and instruments when fetching user", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      profile: {
        id: "profile-1",
        genres: [{ genre: { name: "Rock" } }, { genre: null }],
        instruments: [
          { instrument: { name: "Guitar" }, level: InstrumentLevel.Intermediate },
          { instrument: null, level: InstrumentLevel.Beginner },
        ],
      },
    } as unknown as User);

    const result = await service.findWithProfileById("user-1");

    expect(result).toEqual({
      id: "user-1",
      profile: {
        id: "profile-1",
        genres: ["Rock"],
        instruments: [{ instrument: "Guitar", level: InstrumentLevel.Intermediate }],
      },
    });
  });

  it("creates a new user with normalized email and a profile for role=user", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    userRepo.create.mockReturnValueOnce({ id: "user-1" } as User);
    userRepo.save.mockResolvedValueOnce({
      id: "user-1",
      email: "test@loop.local",
      pseudo: "ada",
      role: UserRole.User,
    } as User);
    profileRepo.create.mockReturnValueOnce({ id: "profile-1" } as Profile);
    profileRepo.save.mockResolvedValueOnce({ id: "profile-1" } as Profile);

    await service.createUser("  TEST@Loop.local ", " ada ", "hashed");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepo.create).toHaveBeenCalledWith({
      email: "test@loop.local",
      pseudo: "ada",
      password: "hashed",
      role: UserRole.User,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileRepo.create).toHaveBeenCalledWith({
      userId: "user-1",
      isPublic: true,
    });
  });

  it("does not create a profile for admins", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    userRepo.create.mockReturnValueOnce({ id: "admin-1" } as User);
    userRepo.save.mockResolvedValueOnce({
      id: "admin-1",
      email: "admin@loop.local",
      pseudo: "admin",
      role: UserRole.Admin,
    } as User);

    await service.createUser("admin@loop.local", "admin", "hashed", UserRole.Admin);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileRepo.create).not.toHaveBeenCalled();
  });

  it("forbids profile access for admins", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "admin-1",
      role: UserRole.Admin,
    } as User);

    await expect(service.getProfileForUser("admin-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws not found when getting profile for missing user", async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.getProfileForUser("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns formatted profile when profile already exists", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      role: UserRole.User,
      profile: { id: "profile-1" },
    } as User);
    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-1",
      genres: [{ genre: { name: "Jazz" } }],
      instruments: [{ instrument: { name: "Piano" }, level: InstrumentLevel.Advanced }],
    } as Profile);

    const result = await service.getProfileForUser("user-1");

    expect(result).toEqual({
      id: "profile-1",
      genres: ["Jazz"],
      instruments: [{ instrument: "Piano", level: InstrumentLevel.Advanced }],
    });
  });

  it("creates a profile if missing and returns hydrated profile when available", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      role: UserRole.User,
      pseudo: "ada",
      profile: null,
    } as User);
    profileRepo.create.mockReturnValueOnce({ id: "profile-1" } as Profile);
    profileRepo.save.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-1",
      genres: [{ genre: { name: "Rock" } }],
      instruments: [{ instrument: { name: "Guitar" }, level: InstrumentLevel.Beginner }],
    } as Profile);

    const result = await service.getProfileForUser("user-1");

    expect(result).toEqual({
      id: "profile-1",
      genres: ["Rock"],
      instruments: [{ instrument: "Guitar", level: InstrumentLevel.Beginner }],
    });
  });

  it("forbids profile updates for admins", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "admin-1",
      role: UserRole.Admin,
    } as User);

    await expect(service.updateProfileForUser("admin-1", {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("updates profile fields and replaces genres/instruments", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      role: UserRole.User,
      profile: { id: "profile-1" },
    } as User);
    profileRepo.merge.mockReturnValueOnce({ id: "profile-1", firstName: "Ada" } as Profile);
    profileRepo.save.mockResolvedValueOnce({ id: "profile-1" } as Profile);

    genreRepo.find.mockResolvedValueOnce([{ id: "genre-1", name: "Rock" } as GenreEntity]);
    (genreRepo.create as unknown as jest.Mock).mockImplementation((items) => items);
    (genreRepo.save as unknown as jest.Mock).mockResolvedValueOnce([
      { id: "genre-2", name: "Jazz" } as GenreEntity,
    ]);
    profileGenreRepo.create.mockImplementation((item) => item as ProfileGenre);

    instrumentRepo.find.mockResolvedValueOnce([
      { id: "inst-1", name: "Guitar" } as InstrumentEntity,
    ]);
    (instrumentRepo.create as unknown as jest.Mock).mockImplementation((items) => items);
    (instrumentRepo.save as unknown as jest.Mock).mockResolvedValueOnce([
      { id: "inst-2", name: "Piano" } as InstrumentEntity,
    ]);
    profileInstrumentRepo.create.mockImplementation((item) => item as ProfileInstrument);

    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-1",
      genres: [{ genre: { name: "Rock" } }],
      instruments: [{ instrument: { name: "Guitar" }, level: InstrumentLevel.Advanced }],
    } as Profile);

    const result = await service.updateProfileForUser("user-1", {
      firstName: "Ada",
      genres: ["Rock", "Jazz", "  Rock "],
      instruments: [
        { instrument: "Guitar", level: InstrumentLevel.Advanced },
        { instrument: "Piano", level: InstrumentLevel.Intermediate },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileGenreRepo.delete).toHaveBeenCalledWith({ profileId: "profile-1" });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileInstrumentRepo.delete).toHaveBeenCalledWith({
      profileId: "profile-1",
    });
    expect(result).toEqual({
      id: "profile-1",
      genres: ["Rock"],
      instruments: [{ instrument: "Guitar", level: InstrumentLevel.Advanced }],
    });
  });

  it("creates a profile when updating for the first time", async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: "user-1",
      role: UserRole.User,
      pseudo: "ada",
      profile: null,
    } as User);
    profileRepo.create.mockReturnValueOnce({ id: "profile-1" } as Profile);
    profileRepo.save.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce({ id: "profile-1" } as Profile);

    const result = await service.updateProfileForUser("user-1", { firstName: "Ada" });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileRepo.create).toHaveBeenCalledWith({
      userId: "user-1",
      isPublic: true,
    });
    expect(result).toEqual({ id: "profile-1", genres: [], instruments: [] });
  });

  it("soft deletes a user by id", async () => {
    await service.softDeleteById("user-1");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepo.softDelete).toHaveBeenCalledWith("user-1");
  });

  it("lists profiles", async () => {
    profileRepo.find.mockResolvedValueOnce([
      {
        id: "profile-1",
        genres: [{ genre: { name: "Rock" } }],
        instruments: [{ instrument: { name: "Guitar" }, level: InstrumentLevel.Beginner }],
      } as Profile,
    ]);

    const result = await service.listProfiles();

    expect(result).toEqual([
      {
        id: "profile-1",
        genres: ["Rock"],
        instruments: [{ instrument: "Guitar", level: InstrumentLevel.Beginner }],
      },
    ]);
  });
});
