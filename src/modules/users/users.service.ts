import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { User } from "./user.entity";
import { InstrumentLevel } from "./profile.enums";
import { UserRole } from "./user-role.enum";

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
  ) {}

  async findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
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
      },
    });
  }

  private formatProfile(profile: Profile) {
    const { genres, instruments, avatar, ...rest } = profile;
    return {
      ...rest,
      hasAvatar: Boolean(avatar),
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
    };
  }

  async findWithProfileById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: {
        profile: {
          genres: { genre: true },
          instruments: { instrument: true },
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
        "bio" | "isPublic" | "firstName" | "lastName" | "phoneNumber" | "birthDate" | "gender"
      >
    > & {
      genres?: string[];
      instruments?: { instrument: string; level: InstrumentLevel }[];
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
    const { genres, instruments, ...profileUpdates } = updates;

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

    const hydrated = await this.loadProfileWithRelations(profileEntity.id);
    return hydrated ? this.formatProfile(hydrated) : profileEntity;
  }

  async listProfiles() {
    const profiles = await this.profileRepo.find({
      relations: {
        genres: { genre: true },
        instruments: { instrument: true },
      },
    });
    return profiles.map((profile) => this.formatProfile(profile));
  }

  async updateAvatarForUser(userId: string, avatar: Buffer | null) {
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

    profileEntity.avatar = avatar;
    await this.profileRepo.save(profileEntity);
    return { ok: true };
  }

  async getAvatarForUser(userId: string) {
    const user = await this.requireUserWithRole(userId);
    if (user.role === UserRole.Admin) {
      throw new ForbiddenException("Les admins n'ont pas de profil utilisateur");
    }

    if (!user.profile) {
      return null;
    }

    const profile = await this.profileRepo.findOne({
      where: { id: user.profile.id },
    });

    if (!profile?.avatar) {
      return null;
    }

    return profile.avatar;
  }

  async listGenres() {
    return this.genreRepo.find({ order: { name: "ASC" } });
  }

  async listInstruments() {
    return this.instrumentRepo.find({ order: { name: "ASC" } });
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
}
