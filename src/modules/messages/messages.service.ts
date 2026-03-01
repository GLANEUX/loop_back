import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, MoreThan, Not, Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { Profile } from "@modules/users/profile.entity";
import { InstrumentLevel } from "@modules/users/profile.enums";
import { Match } from "@modules/discovery/match.entity";
import { RateLimitService } from "@modules/auth/rate-limit.service";
import { TooManyRequestsException } from "@common/exceptions/too-many-requests.exception";
import { Message } from "./message.entity";
import { MessageType } from "./message-type.enum";
import { MessagesGateway } from "./messages.gateway";

const DEFAULT_MESSAGES_LIMIT = 50;
const MAX_MESSAGES_LIMIT = 100;
const USER_RATE_LIMIT = { max: 30, windowMs: 60_000 };
const MATCH_RATE_LIMIT = { max: 5, windowMs: 10_000 };

export type MessageStatus = "sent" | "delivered" | "read";

@Injectable()
export class MessagesService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly rateLimitService: RateLimitService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
  ) {}

  async sendMessage(userId: string, matchId: string, body: string, type: MessageType = MessageType.Text) {
    let authorProfileId: string | null = null;
    let currentProfile: any = null;

    if (type !== MessageType.System) {
      currentProfile = await this.usersService.getProfileForUser(userId);
      authorProfileId = currentProfile?.id ?? null;
    }

    const { match, isProfileA } = await this.getMatchForProfile(authorProfileId ?? "", matchId, type === MessageType.System);

    this.enforceRateLimits(userId, matchId, type === MessageType.System);

    const message = this.messageRepo.create({
      matchId: match.id,
      authorProfileId,
      type,
      body,
    });
    const saved = await this.messageRepo.save(message);
    const status = authorProfileId ? await this.getStatusForAuthor(saved, match, isProfileA) : null;

    const response = {
      id: saved.id,
      matchId: saved.matchId,
      authorProfileId: saved.authorProfileId,
      type: saved.type,
      body: saved.body,
      createdAt: saved.createdAt,
      status,
    };

    // Real-time notification
    this.messagesGateway.emitToMatch(match.id, "message.new", response);

    return response;
  }

  async updateMessage(userId: string, matchId: string, messageId: string, body: string) {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    const { match } = await this.getMatchForProfile(currentProfile.id, matchId);

    const message = await this.messageRepo.findOne({
      where: { id: messageId, matchId, authorProfileId: currentProfile.id, deletedAt: IsNull() },
    });

    if (!message) {
      throw new NotFoundException("Message introuvable ou vous n'etes pas l'auteur");
    }

    if (message.type !== MessageType.Text) {
      throw new BadRequestException("Seuls les messages texte peuvent etre modifies");
    }

    message.body = body;
    message.editedAt = new Date();
    const saved = await this.messageRepo.save(message);

    const response = {
      id: saved.id,
      matchId: saved.matchId,
      authorProfileId: saved.authorProfileId,
      type: saved.type,
      body: saved.body,
      createdAt: saved.createdAt,
      editedAt: saved.editedAt,
    };

    this.messagesGateway.emitToMatch(match.id, "message.updated", response);

    return response;
  }

  async deleteMessage(userId: string, matchId: string, messageId: string) {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    const { match } = await this.getMatchForProfile(currentProfile.id, matchId);

    const message = await this.messageRepo.findOne({
      where: { id: messageId, matchId, authorProfileId: currentProfile.id, deletedAt: IsNull() },
    });

    if (!message) {
      throw new NotFoundException("Message introuvable ou vous n'etes pas l'auteur");
    }

    await this.messageRepo.softDelete(messageId);

    this.messagesGateway.emitToMatch(match.id, "message.deleted", { id: messageId, matchId });

    return { ok: true };
  }

  async listMessages(
    userId: string,
    matchId: string,
    limit = DEFAULT_MESSAGES_LIMIT,
    before?: Date,
    beforeId?: string,
  ) {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    const { match, isProfileA } = await this.getMatchForProfile(currentProfile.id, matchId);

    const take = Math.min(Math.max(limit, 1), MAX_MESSAGES_LIMIT);
    let cursorBefore = before;
    let cursorId = beforeId;

    if (!cursorBefore && cursorId) {
      const cursorMessage = await this.messageRepo.findOne({
        where: { id: cursorId, matchId },
        select: ["id", "createdAt"],
      });
      if (!cursorMessage) {
        throw new NotFoundException("Message introuvable");
      }
      cursorBefore = cursorMessage.createdAt;
    }

    const qb = this.messageRepo
      .createQueryBuilder("message")
      .where("message.match_id = :matchId", { matchId })
      .andWhere("message.deleted_at IS NULL");

    if (cursorBefore) {
      if (cursorId) {
        qb.andWhere(
          "(message.created_at < :before) OR (message.created_at = :before AND message.id < :beforeId)",
          { before: cursorBefore, beforeId: cursorId },
        );
      } else {
        qb.andWhere("message.created_at < :before", { before: cursorBefore });
      }
    }

    const rawMessages = await qb
      .orderBy("message.created_at", "DESC")
      .addOrderBy("message.id", "DESC")
      .take(take + 1)
      .getMany();

    const hasMore = rawMessages.length > take;
    const trimmed = hasMore ? rawMessages.slice(0, take) : rawMessages;
    const nextCursorMessage = hasMore ? trimmed[trimmed.length - 1] : undefined;
    const ascending = trimmed.slice().reverse();

    await this.updateDeliveredPointer(currentProfile.id, match, isProfileA, trimmed);

    const lastReadOtherAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastReadMessageIdByB : match.lastReadMessageIdByA,
    );
    const lastDeliveredOtherAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastDeliveredMessageIdByB : match.lastDeliveredMessageIdByA,
    );

    const messages = ascending.map((message) => {
      const status = this.getStatusForMessage(
        message,
        currentProfile.id,
        lastReadOtherAt,
        lastDeliveredOtherAt,
      );

      return {
        id: message.id,
        matchId: message.matchId,
        authorProfileId: message.authorProfileId,
        type: message.type,
        body: message.body,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        status,
      };
    });

    return {
      messages,
      nextCursor: nextCursorMessage
        ? {
            before: nextCursorMessage.createdAt.toISOString(),
            beforeId: nextCursorMessage.id,
          }
        : undefined,
    };
  }

  async markRead(userId: string, matchId: string, messageId: string) {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    const { match, isProfileA } = await this.getMatchForProfile(currentProfile.id, matchId);

    const message = await this.messageRepo.findOne({
      where: { id: messageId, matchId, deletedAt: IsNull() },
      select: ["id", "createdAt", "authorProfileId"],
    });
    if (!message) {
      throw new NotFoundException("Message introuvable");
    }
    if (message.authorProfileId === currentProfile.id) {
      throw new BadRequestException("Impossible de marquer ses propres messages");
    }

    const currentLastReadAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastReadMessageIdByA : match.lastReadMessageIdByB,
    );
    const currentLastDeliveredAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastDeliveredMessageIdByA : match.lastDeliveredMessageIdByB,
    );

    const updates: Partial<Match> = {};
    let shouldNotify = false;

    if (!currentLastReadAt || message.createdAt > currentLastReadAt) {
      if (isProfileA) {
        updates.lastReadMessageIdByA = message.id;
      } else {
        updates.lastReadMessageIdByB = message.id;
      }
      shouldNotify = true;
    }
    if (!currentLastDeliveredAt || message.createdAt > currentLastDeliveredAt) {
      if (isProfileA) {
        updates.lastDeliveredMessageIdByA = message.id;
      } else {
        updates.lastDeliveredMessageIdByB = message.id;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.matchRepo.update(match.id, updates);
    }

    if (shouldNotify) {
      this.messagesGateway.emitToMatch(match.id, "message.read", {
        matchId: match.id,
        profileId: currentProfile.id,
        messageId: message.id,
      });
    }

    return { ok: true };
  }

  async listThreads(userId: string) {
    const currentProfile = await this.usersService.getProfileForUser(userId);

    const matches = await this.matchRepo.find({
      where: [
        { profileAId: currentProfile.id, deletedAt: IsNull() },
        { profileBId: currentProfile.id, deletedAt: IsNull() },
      ],
      order: { createdAt: "DESC" },
    });

    if (matches.length === 0) {
      return [];
    }

    const otherIds = Array.from(
      new Set(
        matches.map((match) =>
          match.profileAId === currentProfile.id ? match.profileBId : match.profileAId,
        ),
      ),
    );

    const profiles = await this.profileRepo.find({
      where: { id: In(otherIds), deletedAt: IsNull() },
      relations: {
        user: true,
        genres: { genre: true },
        instruments: { instrument: true },
      },
    });
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const matchIds = matches.map((match) => match.id);
    const lastMessages = await this.messageRepo
      .createQueryBuilder("message")
      .distinctOn(["message.match_id"])
      .where("message.match_id IN (:...matchIds)", { matchIds })
      .andWhere("message.deleted_at IS NULL")
      .orderBy("message.match_id", "ASC")
      .addOrderBy("message.created_at", "DESC")
      .addOrderBy("message.id", "DESC")
      .getMany();
    const lastMessageByMatchId = new Map(lastMessages.map((msg) => [msg.matchId, msg]));

    const threads = await Promise.all(
      matches.map(async (match) => {
        const otherId =
          match.profileAId === currentProfile.id ? match.profileBId : match.profileAId;
        const otherProfile = profileById.get(otherId);
        if (!otherProfile) {
          return null;
        }

        const lastReadId =
          match.profileAId === currentProfile.id
            ? match.lastReadMessageIdByA
            : match.lastReadMessageIdByB;
        const lastReadAt = (await this.getMessageCreatedAt(lastReadId)) ?? new Date(0);

        const unreadCount = await this.messageRepo.count({
          where: {
            matchId: match.id,
            deletedAt: IsNull(),
            authorProfileId: Not(currentProfile.id),
            createdAt: MoreThan(lastReadAt),
          },
        });

        const lastMessage = lastMessageByMatchId.get(match.id);

        return {
          matchId: match.id,
          createdAt: match.createdAt,
          profile: this.formatProfileCard(otherProfile),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.body,
                type: lastMessage.type,
                createdAt: lastMessage.createdAt,
                authorProfileId: lastMessage.authorProfileId,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return threads
      .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
      .sort((a, b) => {
        const aDate = a.lastMessage?.createdAt ?? a.createdAt;
        const bDate = b.lastMessage?.createdAt ?? b.createdAt;
        return bDate.getTime() - aDate.getTime();
      });
  }

  async isMemberOfMatch(userId: string, matchId: string): Promise<boolean> {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    const match = await this.matchRepo.findOne({
      where: { id: matchId, deletedAt: IsNull() },
    });
    if (!match) return false;
    return match.profileAId === currentProfile.id || match.profileBId === currentProfile.id;
  }

  notifyNewMatch(userId: string, targetUserId: string, matchId: string) {
    this.messagesGateway.emitToUser(userId, "match.new", { matchId, targetUserId });
    this.messagesGateway.emitToUser(targetUserId, "match.new", { matchId, targetUserId: userId });
  }

  private enforceRateLimits(userId: string, matchId: string, isSystem = false) {
    if (isSystem) return;
    const userKey = `messages:user:${userId}`;
    const matchKey = `messages:match:${matchId}:user:${userId}`;

    const userLimit = this.rateLimitService.hit(
      userKey,
      USER_RATE_LIMIT.max,
      USER_RATE_LIMIT.windowMs,
    );
    if (!userLimit.allowed) {
      throw new TooManyRequestsException("Trop de requetes");
    }

    const matchLimit = this.rateLimitService.hit(
      matchKey,
      MATCH_RATE_LIMIT.max,
      MATCH_RATE_LIMIT.windowMs,
    );
    if (!matchLimit.allowed) {
      throw new TooManyRequestsException("Trop de requetes");
    }
  }

  private async getMatchForProfile(profileId: string, matchId: string, isSystem = false) {
    const match = await this.matchRepo.findOne({
      where: { id: matchId, deletedAt: IsNull() },
    });

    if (!match) {
      throw new NotFoundException("Match introuvable");
    }

    if (isSystem) {
      return { match, isProfileA: false };
    }

    const isProfileA = match.profileAId === profileId;
    const isProfileB = match.profileBId === profileId;

    if (!isProfileA && !isProfileB) {
      throw new ForbiddenException("Match introuvable");
    }

    return { match, isProfileA };
  }

  private async updateDeliveredPointer(
    profileId: string,
    match: Match,
    isProfileA: boolean,
    messages: Message[],
  ) {
    const latestIncoming = messages.find(
      (message) => message.authorProfileId && message.authorProfileId !== profileId,
    );
    if (!latestIncoming) {
      return;
    }

    const currentLastDeliveredAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastDeliveredMessageIdByA : match.lastDeliveredMessageIdByB,
    );

    if (currentLastDeliveredAt && latestIncoming.createdAt <= currentLastDeliveredAt) {
      return;
    }

    await this.matchRepo.update(match.id, {
      ...(isProfileA
        ? { lastDeliveredMessageIdByA: latestIncoming.id }
        : { lastDeliveredMessageIdByB: latestIncoming.id }),
    });
  }

  private getStatusForMessage(
    message: Message,
    currentProfileId: string,
    lastReadOtherAt: Date | null,
    lastDeliveredOtherAt: Date | null,
  ): MessageStatus | null {
    if (message.authorProfileId !== currentProfileId) {
      return null;
    }

    if (lastReadOtherAt && message.createdAt <= lastReadOtherAt) {
      return "read";
    }

    if (lastDeliveredOtherAt && message.createdAt <= lastDeliveredOtherAt) {
      return "delivered";
    }

    return "sent";
  }

  private async getStatusForAuthor(message: Message, match: Match, isProfileA: boolean) {
    const lastReadOtherAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastReadMessageIdByB : match.lastReadMessageIdByA,
    );
    const lastDeliveredOtherAt = await this.getMessageCreatedAt(
      isProfileA ? match.lastDeliveredMessageIdByB : match.lastDeliveredMessageIdByA,
    );
    return (
      this.getStatusForMessage(
        message,
        message.authorProfileId ?? "",
        lastReadOtherAt,
        lastDeliveredOtherAt,
      ) ?? "sent"
    );
  }

  private async getMessageCreatedAt(messageId?: string | null): Promise<Date | null> {
    if (!messageId) {
      return null;
    }
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      select: ["id", "createdAt"],
    });
    return message?.createdAt ?? null;
  }

  private formatProfileCard(profile: Profile) {
    const genres =
      profile.genres
        ?.map((profileGenre) => profileGenre.genre?.name)
        .filter((name): name is string => Boolean(name)) ?? [];
    const instruments =
      profile.instruments
        ?.map((profileInstrument) =>
          profileInstrument.instrument
            ? {
                instrument: profileInstrument.instrument.name,
                level: profileInstrument.level,
              }
            : null,
        )
        .filter(
          (
            instrument,
          ): instrument is { instrument: string; level: InstrumentLevel } => instrument !== null,
        ) ?? [];

    return {
      id: profile.id,
      pseudo: profile.user?.pseudo ?? "",
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      gender: profile.gender ?? null,
      birthDate: profile.birthDate ?? null,
      bio: profile.bio ?? null,
      hasAvatar: Boolean(profile.avatar),
      genres,
      instruments,
    };
  }
}
