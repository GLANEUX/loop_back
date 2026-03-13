import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { UserRole } from "@modules/users/user-role.enum";
import { Profile } from "@modules/users/profile.entity";
import { InstrumentLevel } from "@modules/users/profile.enums";
import { Swipe } from "./swipe.entity";
import { Match } from "./match.entity";
import { Message } from "@modules/messages/message.entity";
import { DiscoveryService } from "./discovery.service";
import { MessagesService } from "@modules/messages/messages.service";

describe("DiscoveryService", () => {
  let service: DiscoveryService;
  let usersService: jest.Mocked<UsersService>;
  let swipeRepo: jest.Mocked<Repository<Swipe>>;
  let matchRepo: jest.Mocked<Repository<Match>>;
  let messageRepo: jest.Mocked<Repository<Message>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: UsersService,
          useValue: {
            getProfileForUser: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Swipe),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            softDelete: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: MessagesService,
          useValue: {
            sendMessage: jest.fn(),
            notifyNewMatch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(DiscoveryService);
    usersService = moduleRef.get(UsersService);
    swipeRepo = moduleRef.get(getRepositoryToken(Swipe));
    matchRepo = moduleRef.get(getRepositoryToken(Match));
    messageRepo = moduleRef.get(getRepositoryToken(Message));
    profileRepo = moduleRef.get(getRepositoryToken(Profile));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns formatted discovery queue excluding swiped profiles", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    swipeRepo.find.mockResolvedValueOnce([{ toProfileId: "profile-2" } as Swipe]);
    profileRepo.find.mockResolvedValueOnce([
      {
        id: "profile-3",
        user: { pseudo: "loopster" },
        genres: [{ genre: { name: "Rock" } }],
        instruments: [{ instrument: { name: "Guitar" }, level: InstrumentLevel.Beginner }],
        avatar: null,
        firstName: "Ada",
        lastName: null,
        gender: null,
        birthDate: null,
        bio: null,
      } as Profile,
    ]);

    const result = await service.getQueue("user-1", 10);

    expect(result).toEqual([
      {
        id: "profile-3",
        pseudo: "loopster",
        firstName: "Ada",
        lastName: null,
        gender: null,
        birthDate: null,
        bio: null,
        hasAvatar: false,
        genres: ["Rock"],
        instruments: [{ instrument: "Guitar", level: InstrumentLevel.Beginner }],
        audio: [],
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(swipeRepo.find).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(profileRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: expect.objectContaining({
          isPublic: true,
          user: { role: UserRole.User, deletedAt: expect.anything() },
        }),
      }),
    );
  });

  it("creates a match when like is reciprocal", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-2",
      isPublic: true,
      user: { role: UserRole.User },
    } as Profile);

    swipeRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "swipe-2", isLike: true } as Swipe);
    swipeRepo.create.mockReturnValueOnce({
      id: "swipe-1",
      fromProfileId: "profile-1",
      toProfileId: "profile-2",
      isLike: true,
      createdAt: new Date(),
    } as Swipe);
    swipeRepo.save.mockResolvedValueOnce({
      id: "swipe-1",
      isLike: true,
      createdAt: new Date(),
    } as Swipe);

    matchRepo.findOne.mockResolvedValueOnce(null);
    matchRepo.create.mockReturnValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
    } as Match);
    matchRepo.save.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
    } as Match);

    const result = await service.swipe("user-1", "profile-2", true);

    expect(result.matchCreated).toBe(true);
    expect(result.matchId).toBe("match-1");
  });

  it("restores a deleted match and resets pointers", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-2",
      isPublic: true,
      user: { role: UserRole.User },
    } as Profile);

    swipeRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "swipe-2", isLike: true } as Swipe);
    swipeRepo.create.mockReturnValueOnce({
      id: "swipe-1",
      fromProfileId: "profile-1",
      toProfileId: "profile-2",
      isLike: true,
      createdAt: new Date(),
    } as Swipe);
    swipeRepo.save.mockResolvedValueOnce({
      id: "swipe-1",
      isLike: true,
      createdAt: new Date(),
    } as Swipe);

    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: new Date(),
    } as Match);

    const result = await service.swipe("user-1", "profile-2", true);

    expect(result.matchCreated).toBe(true);
    expect(result.matchId).toBe("match-1");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(matchRepo.restore).toHaveBeenCalledWith("match-1");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(matchRepo.update).toHaveBeenCalledWith("match-1", {
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    });
  });

  it("updates swipe to pass and removes existing match", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce({
      id: "profile-2",
      isPublic: true,
      user: { role: UserRole.User },
    } as Profile);

    swipeRepo.findOne.mockResolvedValueOnce({
      id: "swipe-1",
      fromProfileId: "profile-1",
      toProfileId: "profile-2",
      isLike: true,
      createdAt: new Date(),
    } as Swipe);
    swipeRepo.save.mockResolvedValueOnce({
      id: "swipe-1",
      isLike: false,
      createdAt: new Date(),
    } as Swipe);

    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
    } as Match);

    const result = await service.swipe("user-1", "profile-2", false);

    expect(result.matchCreated).toBe(false);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(matchRepo.update).toHaveBeenCalledWith("match-1", {
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(messageRepo.softDelete).toHaveBeenCalledWith({ matchId: "match-1" });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(matchRepo.softDelete).toHaveBeenCalledWith("match-1");
  });

  it("rejects swiping on self", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);

    await expect(service.swipe("user-1", "profile-1", true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects swiping on missing profiles", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    profileRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.swipe("user-1", "profile-2", true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("lists swiped profiles (likes/dislikes)", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    swipeRepo.find.mockResolvedValueOnce([
      {
        id: "swipe-1",
        toProfileId: "profile-2",
        createdAt: new Date(),
        isLike: true,
      } as unknown as Swipe,
    ]);
    profileRepo.find.mockResolvedValueOnce([
      {
        id: "profile-2",
        user: { pseudo: "liked-user" },
        genres: [],
        instruments: [],
        avatar: null,
      } as unknown as Profile,
    ]);

    const result = await service.listSwipes("user-1", true);

    expect(result).toHaveLength(1);
    expect(result[0].profile.pseudo).toBe("liked-user");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(swipeRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fromProfileId: "profile-1",
          isLike: true,
        }),
      }),
    );
  });
});
