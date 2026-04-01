import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { SocialLink } from "./social-link.entity";
import { User } from "./user.entity";
import { Block } from "./block.entity";
import { InstrumentLevel, SocialPlatform } from "./profile.enums";
import { UserRole } from "./user-role.enum";

import { ProfileMedia, ProfileMediaType } from "./profile-media.entity";
import { DiscoveryService } from "@modules/discovery/discovery.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(GenreEntity)
    private readonly genreRepo: Repository<GenreEntity>,
    @InjectRepository(InstrumentEntity)
    private readonly instrumentRepo: Repository<InstrumentEntity>,
    @InjectRepository(ProfileGenre)
    private readonly profileGenreRepo: Repository<ProfileGenre>,
    @InjectRepository(ProfileInstrument)
    private readonly profileInstrumentRepo: Repository<ProfileInstrument>,
    @InjectRepository(ProfileMedia)
    private readonly profileMediaRepo: Repository<ProfileMedia>,
    @InjectRepository(SocialLink)
    private readonly socialLinkRepo: Repository<SocialLink>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    @Inject(forwardRef(() => DiscoveryService))
    private readonly discoveryService: DiscoveryService,
  ) {}

    async blockUser(blockerUserId: string, blockedProfileId: string) {
    const blockerProfile = await this.getOrCreateProfile(blockerUserId);
    if (blockerProfile.id === blockedProfileId) {
      throw new BadRequestException("Vous ne pouvez pas vous bloquer vous-même");
    }

    const blockedProfile = await this.profileRepo.findOne({
      where: { id: blockedProfileId },
    });
    if (!blockedProfile) {
      throw new NotFoundException("Profil à bloquer introuvable");
    }

    let block = await this.blockRepo.findOne({
      where: {
        blockerProfileId: blockerProfile.id,
        blockedProfileId: blockedProfileId,
      },
      withDeleted: true,
    });

    if (block?.deletedAt) {
      await this.blockRepo.restore(block.id);
    } else if (!block) {
      block = this.blockRepo.create({
        blockerProfileId: blockerProfile.id,
        blockedProfileId: blockedProfileId,
      });
      await this.blockRepo.save(block);
    }

    // Break any existing match
    await this.discoveryService.removeMatch(blockerProfile.id, blockedProfileId);

    return { ok: true };
    }

    async unblockUser(blockerUserId: string, blockedProfileId: string) {
    const blockerProfile = await this.getOrCreateProfile(blockerUserId);
    const block = await this.blockRepo.findOne({
      where: {
        blockerProfileId: blockerProfile.id,
        blockedProfileId: blockedProfileId,
      },
    });

    if (block) {
      await this.blockRepo.softDelete(block.id);
    }

    return { ok: true };
    }

    async listBlockedUsers(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const blocks = await this.blockRepo.find({
      where: { blockerProfileId: profile.id },
      relations: { blockedProfile: { user: true } },
    });

    return blocks.map((b) => this.formatProfile(b.blockedProfile));
    }

    async isBlocked(profileAId: string, profileBId: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: [
        { blockerProfileId: profileAId, blockedProfileId: profileBId },
        { blockerProfileId: profileBId, blockedProfileId: profileAId },
      ],
    });
    return count > 0;
    }

    async getBlockedProfileIds(profileId: string): Promise<string[]> {
    const blocks = await this.blockRepo.find({
      where: [{ blockerProfileId: profileId }, { blockedProfileId: profileId }],
      select: ["blockerProfileId", "blockedProfileId"],
    });

    const ids = new Set<string>();
    blocks.forEach((b) => {
      ids.add(b.blockerProfileId);
      ids.add(b.blockedProfileId);
    });
    return Array.from(ids);
    }

  async findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findByPseudo(pseudo: string) {
    return this.userRepo.findOne({
      where: { pseudo: pseudo.trim() },
    });
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizePseudo(value: string) {
    return value.trim();
  }

  private async loadProfileWithRelations(profileId: string) {
    return this.profileRepo.findOne({
      where: { id: profileId },
      relations: {
        genres: { genre: true },
        instruments: { instrument: true },
        media: true,
        socialLinks: true,
      },
    });
  }

  private formatProfile(profile: Profile) {
    const {
      id,
      userId,
      firstName,
      lastName,
      phoneNumber,
      birthDate,
      gender,
      bio,
      avatarMediaId,
      featuredAudioId,
      isPublic,
      city,
      country,
      lat,
      lon,
      createdAt,
      updatedAt,
      deletedAt,
      genres,
      instruments,
      media,
      socialLinks,
    } = profile;

    const validation = Profile.validateProfile(profile);

    return {
      id,
      user_id: userId,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      phone_number: phoneNumber ?? null,
      birth_date: birthDate ?? null,
      gender: gender ?? null,
      bio: bio ?? null,
      avatar_media_id: avatarMediaId ?? null,
      featured_audio_id: featuredAudioId ?? null,
      is_public: isPublic,
      city: city ?? null,
      country: country ?? null,
      lat: lat ?? null,
      lon: lon ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt ?? null,
      hasAvatar: Boolean(avatarMediaId),
      isValid: validation.isValid,
      missingFields: validation.missingFields,
      genres:
        genres
          ?.map((profileGenre) => profileGenre.genre?.name)
          .filter((name): name is string => Boolean(name)) ?? [],
      instruments:
        instruments
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
          ) ?? [],
      social_links:
        socialLinks?.map((link) => ({
          id: link.id,
          profile_id: link.profileId,
          platform: link.platform,
          url: link.url,
          created_at: link.createdAt,
          updated_at: link.updatedAt,
          deleted_at: link.deletedAt ?? null,
        })) ?? [],
      media:
        media
          ?.sort((a, b) => a.order - b.order)
          // Hide avatar from generic media gallery
          .filter((m) => m.id !== avatarMediaId)
          .map((m) => ({
            id: m.id,
            profile_id: m.profileId,
            type: m.type,
            title: m.title ?? null,
            mime_type: m.mimeType,
            order: m.order,
            created_at: m.createdAt,
            updated_at: m.updatedAt,
            deleted_at: m.deletedAt ?? null,
            url: `/user/media/${m.id}`,
          })) ?? [],
    };
  }

  async getProfileById(profileId: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId, isPublic: true, deletedAt: IsNull() },
      relations: {
        genres: { genre: true },
        instruments: { instrument: true },
        media: true,
      },
    });

    if (!profile) {
      throw new NotFoundException("Profil introuvable");
    }

    return this.formatProfile(profile);
  }

  async findWithProfileById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: {
        profile: {
          genres: { genre: true },
          instruments: { instrument: true },
          media: true,
        },
      },
    });

    if (!user) {
      return user;
    }

    if (user.profile) {
      return { ...user, profile: this.formatProfile(user.profile) };
    }

    return user;
  }

  async createUser(
    email: string,
    pseudo: string,
    password: string,
    role: UserRole = UserRole.User,
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException("Email déjà utilisé");
    }

    const normalizedPseudo = this.normalizePseudo(pseudo);
    const existingPseudo = await this.findByPseudo(normalizedPseudo);
    if (existingPseudo) {
      throw new ConflictException("Pseudo déjà utilisé");
    }

    const user = this.userRepo.create({
      email: normalizedEmail,
      pseudo: normalizedPseudo,
      password,
      role,
    });

    const savedUser = await this.userRepo.save(user);

    if (savedUser.role === UserRole.User) {
      const profile = this.profileRepo.create({
        userId: savedUser.id,
        isPublic: true,
      });
      await this.profileRepo.save(profile);
    }

    return savedUser;
  }

  private async requireUserWithRole(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { profile: true },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    return user;
  }

  async getProfileForUser(userId: string) {
    const user = await this.requireUserWithRole(userId);
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException("Les admins n'ont pas de profil utilisateur");
    }

    if (user.profile) {
      const profile = await this.loadProfileWithRelations(user.profile.id);
      return profile ? this.formatProfile(profile) : user.profile;
    }

    const profile = this.profileRepo.create({
      userId: user.id,
      isPublic: true,
    });
    const saved = await this.profileRepo.save(profile);
    const hydrated = await this.loadProfileWithRelations(saved.id);
    return hydrated ? this.formatProfile(hydrated) : saved;
  }

  async updateProfileForUser(
    userId: string,
    updates: Partial<
      Pick<
        Profile,
        | "bio"
        | "isPublic"
        | "firstName"
        | "lastName"
        | "phoneNumber"
        | "birthDate"
        | "gender"
        | "city"
        | "country"
        | "lat"
        | "lon"
      >
    > & {
      genres?: string[];
      instruments?: { instrument: string; level: InstrumentLevel }[];
      socialLinks?: { platform: SocialPlatform; url: string }[];
    },
  ) {
    const user = await this.requireUserWithRole(userId);
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException("Les admins n'ont pas de profil utilisateur");
    }

    let profileEntity: Profile;
    if (user.profile) {
      profileEntity = user.profile;
    } else {
      const created = this.profileRepo.create({
        userId: user.id,
        isPublic: true,
      });
      profileEntity = await this.profileRepo.save(created);
    }
    const { genres, instruments, socialLinks, ...profileUpdates } = updates;

    if (Object.keys(profileUpdates).length > 0) {
      const merged = this.profileRepo.merge(profileEntity, profileUpdates);
      await this.profileRepo.save(merged);
    }

    if (genres) {
      const normalizedGenres = Array.from(
        new Set(genres.map((name) => name.trim()).filter(Boolean)),
      );
      const existingGenres = await this.genreRepo.find({
        where: { name: In(normalizedGenres) },
      });
      const existingNames = new Set(existingGenres.map((genre) => genre.name));
      const missingGenres = normalizedGenres.filter((name) => !existingNames.has(name));
      if (missingGenres.length > 0) {
        const created = this.genreRepo.create(
          missingGenres.map((name) => ({
            name,
            slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
          })),
        );
        const saved = await this.genreRepo.save(created);
        existingGenres.push(...saved);
      }

      await this.profileGenreRepo.delete({ profileId: profileEntity.id });
      const genreLinks = existingGenres.map((genre) =>
        this.profileGenreRepo.create({
          profileId: profileEntity.id,
          genreId: genre.id,
        }),
      );
      if (genreLinks.length > 0) {
        await this.profileGenreRepo.save(genreLinks);
      }
    }

    if (instruments) {
      const instrumentMap = new Map<string, InstrumentLevel>();
      instruments.forEach((item) => {
        const name = item.instrument.trim();
        if (name) {
          instrumentMap.set(name, item.level);
        }
      });
      const uniqueInstruments = Array.from(instrumentMap.entries()).map(([instrument, level]) => ({
        instrument,
        level,
      }));
      const instrumentNames = uniqueInstruments.map((item) => item.instrument);
      const existingInstruments = await this.instrumentRepo.find({
        where: { name: In(instrumentNames) },
      });
      const existingNames = new Set(existingInstruments.map((instrument) => instrument.name));
      const missing = instrumentNames.filter((name) => !existingNames.has(name));
      if (missing.length > 0) {
        const created = this.instrumentRepo.create(
          missing.map((name) => ({
            name,
            slug: name.trim().toLowerCase().replace(/\s+/g, "-"),
          })),
        );
        const saved = await this.instrumentRepo.save(created);
        existingInstruments.push(...saved);
      }

      const instrumentByName = new Map(
        existingInstruments.map((instrument) => [instrument.name, instrument]),
      );
      await this.profileInstrumentRepo.delete({ profileId: profileEntity.id });
      const instrumentLinks = uniqueInstruments
        .map((item) => {
          const instrument = instrumentByName.get(item.instrument);
          if (!instrument) {
            return null;
          }
          return this.profileInstrumentRepo.create({
            profileId: profileEntity.id,
            instrumentId: instrument.id,
            level: item.level,
          });
        })
        .filter(Boolean) as ProfileInstrument[];

      if (instrumentLinks.length > 0) {
        await this.profileInstrumentRepo.save(instrumentLinks);
      }
    }

    if (socialLinks) {
      await this.socialLinkRepo.delete({ profileId: profileEntity.id });
      if (socialLinks.length > 0) {
        const links = socialLinks.map((link) =>
          this.socialLinkRepo.create({
            profileId: profileEntity.id,
            platform: link.platform,
            url: link.url,
          }),
        );
        await this.socialLinkRepo.save(links);
      }
    }

    const hydrated = await this.loadProfileWithRelations(profileEntity.id);
    return hydrated ? this.formatProfile(hydrated) : profileEntity;
  }

  async listProfiles() {
    const profiles = await this.profileRepo.find({
      relations: {
        genres: { genre: true },
        instruments: { instrument: true },
        media: true,
      },
    });
    return profiles.map((profile) => this.formatProfile(profile));
  }

  async getAvatarForUser(userId: string) {
    const user = await this.requireUserWithRole(userId);
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException("Les admins n'ont pas de profil utilisateur");
    }

    if (!user.profile?.avatarMediaId) {
      return null;
    }

    return this.profileMediaRepo.findOne({
      where: { id: user.profile.avatarMediaId },
      select: ["data", "mimeType"],
    });
  }

  async getAvatarForProfile(profileId: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId, isPublic: true, deletedAt: IsNull() },
    });

    if (!profile?.avatarMediaId) {
      return null;
    }

    return this.profileMediaRepo.findOne({
      where: { id: profile.avatarMediaId },
      select: ["data", "mimeType"],
    });
  }

  async getFeaturedAudioForProfile(profileId: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId, isPublic: true, deletedAt: IsNull() },
    });

    if (!profile?.featuredAudioId) {
      return null;
    }

    return this.profileMediaRepo.findOne({
      where: { id: profile.featuredAudioId },
      select: ["data", "mimeType"],
    });
  }

  async listGenres() {
    return this.genreRepo.find({ order: { name: "ASC" } });
  }

  async listInstruments() {
    return this.instrumentRepo.find({ order: { name: "ASC" } });
  }

  private async getOrCreateProfile(userId: string): Promise<Profile> {
    const user = await this.requireUserWithRole(userId);
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException("Les admins n'ont pas de profil utilisateur");
    }
    if (user.profile) {
      return user.profile;
    }
    const created = this.profileRepo.create({
      userId: user.id,
      isPublic: true,
    });
    return this.profileRepo.save(created);
  }

  async addProfileMedia(
    userId: string,
    data: Buffer,
    mimeType: string,
    type: ProfileMediaType,
    title?: string,
    options?: { isAvatar?: boolean; isFeatured?: boolean },
  ) {
    const profile = await this.getOrCreateProfile(userId);

    // If it's a replacement for avatar, we might want to delete the old one
    let oldAvatarId: string | null = null;
    if (options?.isAvatar && type === ProfileMediaType.Image) {
      oldAvatarId = profile.avatarMediaId ?? null;
    }

    const count = await this.profileMediaRepo.count({ where: { profileId: profile.id } });

    const media = this.profileMediaRepo.create({
      profileId: profile.id,
      data,
      mimeType,
      type,
      title,
      order: count,
    });

    const savedMedia = await this.profileMediaRepo.save(media);

    // Update profile pointers
    if (options?.isAvatar && type === ProfileMediaType.Image) {
      await this.profileRepo.update(profile.id, { avatarMediaId: savedMedia.id });
      // Soft deletion of old avatar media
      if (oldAvatarId) {
        await this.profileMediaRepo.softDelete(oldAvatarId);
      }
    }

    if (options?.isFeatured && type === ProfileMediaType.Audio) {
      await this.profileRepo.update(profile.id, { featuredAudioId: savedMedia.id });
    }

    return savedMedia;
  }

  async updateAvatarForUser(userId: string, data: Buffer) {
    await this.addProfileMedia(
      userId,
      data,
      "application/octet-stream",
      ProfileMediaType.Image,
      "Avatar",
      {
        isAvatar: true,
      },
    );
    return { ok: true };
  }

  async setFeaturedAudio(userId: string, mediaId: string | null) {
    const profile = await this.getOrCreateProfile(userId);

    if (mediaId) {
      const media = await this.profileMediaRepo.findOne({
        where: { id: mediaId, profileId: profile.id, type: ProfileMediaType.Audio },
      });
      if (!media) {
        throw new BadRequestException(
          "Média introuvable, ne vous appartient pas ou n'est pas un audio",
        );
      }
    }

    await this.profileRepo.update(profile.id, { featuredAudioId: mediaId });
    return { ok: true };
  }

  async getProfileMedia(id: string) {
    const media = await this.profileMediaRepo.findOne({
      where: { id },
      select: ["id", "data", "mimeType"],
    });
    if (!media) {
      throw new NotFoundException("Média introuvable");
    }
    return media;
  }

  async listProfileMedia(userId: string, type: ProfileMediaType) {
    const profile = await this.getOrCreateProfile(userId);
    const media = await this.profileMediaRepo.find({
      where: { profileId: profile.id, type },
      order: { order: "ASC" },
    });

    // For images, exclude the current avatar
    if (type === ProfileMediaType.Image) {
      return media.filter((m) => m.id !== profile.avatarMediaId);
    }

    return media;
  }

  async deleteProfileMedia(userId: string, mediaId: string) {
    const user = await this.requireUserWithRole(userId);
    if (!user.profile) {
      throw new NotFoundException("Profil introuvable");
    }

    const media = await this.profileMediaRepo.findOne({
      where: { id: mediaId, profileId: user.profile.id },
    });

    if (!media) {
      throw new NotFoundException("Média introuvable ou vous n'êtes pas le propriétaire");
    }

    // FKs will be set to NULL automatically by DB (ON DELETE SET NULL)
    await this.profileMediaRepo.softRemove(media);
    return { ok: true };
  }

  async deleteAvatar(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.avatarMediaId) {
      return { ok: true };
    }

    const mediaId = profile.avatarMediaId;
    // Clearing the FK first is safer, although ON DELETE SET NULL would handle it
    await this.profileRepo.update(profile.id, { avatarMediaId: null });
    await this.profileMediaRepo.softDelete(mediaId);

    return { ok: true };
  }

  async softDeleteById(id: string) {
    await this.userRepo.softDelete(id);
  }

  async updatePasswordById(id: string, password: string) {
    await this.userRepo.update({ id }, { password });
  }

  async updateEmailById(id: string, email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (user.email === normalizedEmail) {
      return { ok: true };
    }

    const existing = await this.findByEmail(normalizedEmail);
    if (existing && existing.id !== id) {
      throw new ConflictException("Email déjà utilisé");
    }

    await this.userRepo.update({ id }, { email: normalizedEmail });
    return { ok: true };
  }

  async updatePseudoById(id: string, pseudo: string) {
    const normalized = this.normalizePseudo(pseudo);
    const existing = await this.findByPseudo(normalized);
    if (existing && existing.id !== id) {
      throw new ConflictException("Pseudo déjà utilisé");
    }
    await this.userRepo.update({ id }, { pseudo: normalized });
    return { ok: true };
  }
}
