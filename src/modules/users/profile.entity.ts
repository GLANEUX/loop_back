import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { ProfileMedia } from "./profile-media.entity";
import { SocialLink } from "./social-link.entity";

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id", unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 120, name: "first_name", nullable: true })
  firstName?: string | null;

  @Column({ type: "varchar", length: 120, name: "last_name", nullable: true })
  lastName?: string | null;

  @Column({ type: "varchar", length: 32, name: "phone_number", nullable: true })
  phoneNumber?: string | null;

  @Column({ type: "date", name: "birth_date", nullable: true })
  birthDate?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  gender?: string | null;

  @Column({ type: "text", nullable: true })
  bio?: string | null;

  @Column({ type: "uuid", name: "avatar_media_id", nullable: true })
  avatarMediaId?: string | null;

  @OneToOne(() => ProfileMedia, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "avatar_media_id" })
  avatarMedia?: ProfileMedia | null;

  @Column({ type: "uuid", name: "featured_audio_id", nullable: true })
  featuredAudioId?: string | null;

  @OneToOne(() => ProfileMedia, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "featured_audio_id" })
  featuredAudio?: ProfileMedia | null;

  @Column({ type: "boolean", name: "is_public", default: true })
  isPublic!: boolean;

  @Column({ type: "varchar", length: 120, nullable: true })
  city?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  country?: string | null;

  @Column({ type: "double precision", nullable: true })
  lat?: number | null;

  @Column({ type: "double precision", nullable: true })
  lon?: number | null;

  @OneToMany(() => ProfileInstrument, (instrument) => instrument.profile, {
    cascade: true,
  })
  instruments?: ProfileInstrument[];

  @OneToMany(() => ProfileGenre, (genre) => genre.profile, {
    cascade: true,
  })
  genres?: ProfileGenre[];

  @OneToMany(() => ProfileMedia, (media) => media.profile)
  media?: ProfileMedia[];

  @OneToMany(() => SocialLink, (socialLink) => socialLink.profile, {
    cascade: true,
  })
  socialLinks?: SocialLink[];

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;

  /**
   * Validates if a profile is complete according to business rules.
   * A profile is valid if it has:
   * - firstName, bio, birthDate, gender, avatarMediaId
   * - city, country (location)
   * - At least one genre
   * - At least one instrument
   */
  static validateProfile(profile: Partial<Profile>): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!profile.firstName?.trim()) missingFields.push("firstName");
    if (!profile.phoneNumber?.trim()) missingFields.push("phoneNumber");
    if (!profile.bio?.trim()) missingFields.push("bio");
    if (!profile.birthDate) missingFields.push("birthDate");
    if (!profile.gender?.trim()) missingFields.push("gender");
    if (!profile.avatarMediaId) missingFields.push("avatar");
    if (!profile.city?.trim()) missingFields.push("city");
    if (!profile.country?.trim()) missingFields.push("country");
    if (!profile.featuredAudioId) missingFields.push("audio_presentation");

    if (!profile.genres || profile.genres.length === 0) {
      missingFields.push("genres");
    }

    if (!profile.instruments || profile.instruments.length === 0) {
      missingFields.push("instruments");
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}
