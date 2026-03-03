import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { UserRole } from "@modules/users/user-role.enum";
import { Profile } from "@modules/users/profile.entity";
import { InstrumentLevel } from "@modules/users/profile.enums";
import { Swipe } from "./swipe.entity";
import { Match } from "./match.entity";
import { Message } from "@modules/messages/message.entity";
import { MessagesService } from "@modules/messages/messages.service";
import { MessageType } from "@modules/messages/message-type.enum";

const DEFAULT_QUEUE_LIMIT = 20;
const MAX_QUEUE_LIMIT = 50;

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Swipe)
    private readonly swipeRepo: Repository<Swipe>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

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
          (instrument): instrument is { instrument: string; level: InstrumentLevel } =>
            instrument !== null,
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

  async getQueue(userId: string, limit = DEFAULT_QUEUE_LIMIT) {
    const cappedLimit = Math.min(Math.max(limit, 1), MAX_QUEUE_LIMIT);
    const currentProfile = await this.usersService.getProfileForUser(userId);

    const swipes = await this.swipeRepo.find({
      where: { fromProfileId: currentProfile.id, deletedAt: IsNull() },
      select: ["toProfileId"],
    });
    const excludedIds = new Set<string>([currentProfile.id]);
    swipes.forEach((swipe) => excludedIds.add(swipe.toProfileId));

    const where: Record<string, unknown> = {
      isPublic: true,
      deletedAt: IsNull(),
      user: { role: UserRole.User, deletedAt: IsNull() },
    };

    if (excludedIds.size > 0) {
      where.id = Not(In(Array.from(excludedIds)));
    }

    const profiles = await this.profileRepo.find({
      where,
      relations: {
        user: true,
        genres: { genre: true },
        instruments: { instrument: true },
      },
      order: { createdAt: "DESC" },
      take: cappedLimit,
    });

    return profiles.map((profile) => this.formatProfileCard(profile));
  }

  async swipe(userId: string, targetProfileId: string, isLike: boolean) {
    const currentProfile = await this.usersService.getProfileForUser(userId);
    if (currentProfile.id === targetProfileId) {
      throw new BadRequestException("Impossible de swiper son propre profil");
    }

    const targetProfile = await this.profileRepo.findOne({
      where: {
        id: targetProfileId,
        isPublic: true,
        deletedAt: IsNull(),
        user: { role: UserRole.User, deletedAt: IsNull() },
      },
      relations: { user: true },
    });
    if (!targetProfile) {
      throw new NotFoundException("Profil introuvable");
    }

    let swipe = await this.swipeRepo.findOne({
      where: { fromProfileId: currentProfile.id, toProfileId: targetProfileId },
    });

    if (!swipe) {
      swipe = this.swipeRepo.create({
        fromProfileId: currentProfile.id,
        toProfileId: targetProfileId,
        isLike,
      });
      swipe = await this.swipeRepo.save(swipe);
    } else if (swipe.isLike !== isLike) {
      swipe.isLike = isLike;
      swipe = await this.swipeRepo.save(swipe);
    }

    let matchCreated = false;
    let matchId: string | undefined;

    if (isLike) {
      const reciprocal = await this.swipeRepo.findOne({
        where: {
          fromProfileId: targetProfileId,
          toProfileId: currentProfile.id,
          isLike: true,
          deletedAt: IsNull(),
        },
      });

      if (reciprocal) {
        const match = await this.ensureMatch(currentProfile.id, targetProfileId);
        matchCreated = match.created;
        matchId = match.match.id;
      }
    } else {
      await this.removeMatch(currentProfile.id, targetProfileId);
    }

    return {
      swipeId: swipe.id,
      isLike: swipe.isLike,
      createdAt: swipe.createdAt,
      matchCreated,
      matchId,
    };
  }

  async listMatches(userId: string) {
    const currentProfile = await this.usersService.getProfileForUser(userId);

    const matches = await this.matchRepo.find({
      where: [
        { profileAId: currentProfile.id, deletedAt: IsNull() },
        { profileBId: currentProfile.id, deletedAt: IsNull() },
      ],
      order: { createdAt: "DESC" },
    });

    const otherIds = Array.from(
      new Set(
        matches.map((match) =>
          match.profileAId === currentProfile.id ? match.profileBId : match.profileAId,
        ),
      ),
    );

    if (otherIds.length === 0) {
      return [];
    }

    const profiles = await this.profileRepo.find({
      where: { id: In(otherIds), deletedAt: IsNull() },
      relations: {
        user: true,
        genres: { genre: true },
        instruments: { instrument: true },
      },
    });
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return matches.flatMap((match) => {
      const otherId = match.profileAId === currentProfile.id ? match.profileBId : match.profileAId;
      const otherProfile = profileById.get(otherId);
      if (!otherProfile) {
        return [];
      }
      return [
        {
          id: match.id,
          createdAt: match.createdAt,
          profile: this.formatProfileCard(otherProfile),
        },
      ];
    });
  }

  private normalizeMatchPair(profileId: string, otherProfileId: string) {
    return profileId < otherProfileId
      ? { profileAId: profileId, profileBId: otherProfileId }
      : { profileAId: otherProfileId, profileBId: profileId };
  }

  private async ensureMatch(profileId: string, otherProfileId: string) {
    const { profileAId, profileBId } = this.normalizeMatchPair(profileId, otherProfileId);
    let match = await this.matchRepo.findOne({
      where: { profileAId, profileBId },
      withDeleted: true,
    });

    if (!match) {
      match = this.matchRepo.create({ profileAId, profileBId });
      match = await this.matchRepo.save(match);
      await this.onMatchCreated(match);
      return { match, created: true };
    }

    if (match.deletedAt) {
      await this.matchRepo.restore(match.id);
      await this.matchRepo.update(match.id, {
        lastReadMessageIdByA: null,
        lastReadMessageIdByB: null,
        lastDeliveredMessageIdByA: null,
        lastDeliveredMessageIdByB: null,
      });
      const restored = { ...match, deletedAt: null };
      await this.onMatchCreated(restored);
      return { match: restored, created: true };
    }

    return { match, created: false };
  }

  private async onMatchCreated(match: Match) {
    // Send system message
    await this.messagesService.sendMessage(
      "", // System message has no author
      match.id,
      "C'est un match ! Commencez à discuter.",
      MessageType.System,
    );

    // Notify users via WebSockets
    const profileA = await this.profileRepo.findOne({
      where: { id: match.profileAId },
      select: ["userId"],
    });
    const profileB = await this.profileRepo.findOne({
      where: { id: match.profileBId },
      select: ["userId"],
    });

    if (profileA?.userId && profileB?.userId) {
      this.messagesService.notifyNewMatch(profileA.userId, profileB.userId, match.id);
    }
  }

  private async removeMatch(profileId: string, otherProfileId: string) {
    const { profileAId, profileBId } = this.normalizeMatchPair(profileId, otherProfileId);
    const match = await this.matchRepo.findOne({
      where: { profileAId, profileBId, deletedAt: IsNull() },
    });
    if (!match) {
      return;
    }
    await this.matchRepo.update(match.id, {
      lastReadMessageIdByA: null,
      lastReadMessageIdByB: null,
      lastDeliveredMessageIdByA: null,
      lastDeliveredMessageIdByB: null,
    });
    await this.messageRepo.softDelete({ matchId: match.id });
    await this.matchRepo.softDelete(match.id);
  }
}
