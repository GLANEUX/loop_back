import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { Profile } from "@modules/users/profile.entity";
import { Match } from "@modules/discovery/match.entity";
import { RateLimitService } from "@modules/auth/rate-limit.service";
import { TooManyRequestsException } from "@common/exceptions/too-many-requests.exception";
import { Message } from "./message.entity";
import { MessageType } from "./message-type.enum";
import { MessagesService } from "./messages.service";
import { MessagesGateway } from "./messages.gateway";

describe("MessagesService", () => {
  let service: MessagesService;
  let usersService: jest.Mocked<UsersService>;
  let messageRepo: jest.Mocked<Repository<Message>>;
  let matchRepo: jest.Mocked<Repository<Match>>;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let messagesGateway: jest.Mocked<MessagesGateway>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: UsersService,
          useValue: { getProfileForUser: jest.fn(), isBlocked: jest.fn() },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
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
          provide: RateLimitService,
          useValue: {
            hit: jest.fn(),
          },
        },
        {
          provide: MessagesGateway,
          useValue: {
            emitToMatch: jest.fn(),
            emitToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MessagesService);
    usersService = moduleRef.get(UsersService);
    messageRepo = moduleRef.get(getRepositoryToken(Message));
    matchRepo = moduleRef.get(getRepositoryToken(Match));
    rateLimitService = moduleRef.get(RateLimitService);
    messagesGateway = moduleRef.get(MessagesGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sends a message with status sent", async () => {
    const now = new Date("2025-01-01T00:00:00.000Z");
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    } as Match);
    rateLimitService.hit.mockReturnValue({ allowed: true, count: 0, resetAt: 0 });

    messageRepo.create.mockReturnValueOnce({
      id: "msg-1",
      matchId: "match-1",
      authorProfileId: "profile-1",
      type: MessageType.Text,
      body: "Hello",
      createdAt: now,
    } as Message);
    messageRepo.save.mockResolvedValueOnce({
      id: "msg-1",
      matchId: "match-1",
      authorProfileId: "profile-1",
      type: MessageType.Text,
      body: "Hello",
      createdAt: now,
    } as Message);

    const result = await service.sendMessage("user-1", "match-1", "Hello");

    expect(result.status).toBe("sent");
    expect(result.body).toBe("Hello");
  });

  it("throws ForbiddenException when trying to message a blocked user", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
    } as Match);
    usersService.isBlocked.mockResolvedValueOnce(true);

    await expect(service.sendMessage("user-1", "match-1", "hello")).rejects.toThrow(
      "Communication impossible (blocage en cours)",
    );
  });

  it("rejects sending a message when match is missing", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.sendMessage("user-1", "match-1", "Hello")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("paginates messages and returns next cursor", async () => {
    const match: Match = {
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    } as Match;

    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce(match);

    const messages = [
      {
        id: "msg-3",
        matchId: "match-1",
        authorProfileId: "profile-2",
        type: MessageType.Text,
        body: "Third",
        createdAt: new Date("2025-01-03T00:00:00.000Z"),
      },
      {
        id: "msg-2",
        matchId: "match-1",
        authorProfileId: "profile-1",
        type: MessageType.Text,
        body: "Second",
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      },
      {
        id: "msg-1",
        matchId: "match-1",
        authorProfileId: "profile-2",
        type: MessageType.Text,
        body: "First",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    ] as Message[];

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(messages),
    };
    messageRepo.createQueryBuilder.mockReturnValue(qb as unknown as any);

    const result = await service.listMessages("user-1", "match-1", 2);

    expect(result.messages.map((msg) => msg.id)).toEqual(["msg-2", "msg-3"]);
    expect(result.nextCursor?.beforeId).toBe("msg-2");

    expect(matchRepo.update).toHaveBeenCalledWith("match-1", {
      lastDeliveredMessageIdByA: "msg-3",
    });
  });

  it("marks read and does not downgrade", async () => {
    const match: Match = {
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      lastReadMessageIdByA: "msg-2",
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: "msg-2",
      lastDeliveredMessageIdByB: null,
    } as Match;

    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce(match);

    messageRepo.findOne
      .mockResolvedValueOnce({
        id: "msg-1",
        matchId: "match-1",
        authorProfileId: "profile-2",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as Message)
      .mockResolvedValueOnce({
        id: "msg-2",
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      } as Message)
      .mockResolvedValueOnce({
        id: "msg-2",
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      } as Message);

    const result = await service.markRead("user-1", "match-1", "msg-1");

    expect(result).toEqual({ ok: true });

    expect(matchRepo.update).not.toHaveBeenCalled();
  });

  it("marks read when message is newer", async () => {
    const match: Match = {
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      lastReadMessageIdByA: "msg-1",
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: "msg-1",
      lastDeliveredMessageIdByB: null,
    } as Match;

    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce(match);

    messageRepo.findOne
      .mockResolvedValueOnce({
        id: "msg-2",
        matchId: "match-1",
        authorProfileId: "profile-2",
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      } as Message)
      .mockResolvedValueOnce({
        id: "msg-1",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as Message)
      .mockResolvedValueOnce({
        id: "msg-1",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      } as Message);

    await service.markRead("user-1", "match-1", "msg-2");

    expect(matchRepo.update).toHaveBeenCalledWith("match-1", {
      lastReadMessageIdByA: "msg-2",
      lastDeliveredMessageIdByA: "msg-2",
    });
  });

  it("rate limits sending messages", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    } as Match);
    rateLimitService.hit.mockReturnValueOnce({ allowed: false, count: 0, resetAt: 0 });

    await expect(service.sendMessage("user-1", "match-1", "Hello")).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
  });

  it("rejects marking own message as read", async () => {
    usersService.getProfileForUser.mockResolvedValueOnce({ id: "profile-1" } as Profile);
    matchRepo.findOne.mockResolvedValueOnce({
      id: "match-1",
      profileAId: "profile-1",
      profileBId: "profile-2",
      deletedAt: null,
    } as Match);

    messageRepo.findOne.mockResolvedValueOnce({
      id: "msg-1",
      matchId: "match-1",
      authorProfileId: "profile-1",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    } as Message);

    await expect(service.markRead("user-1", "match-1", "msg-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
