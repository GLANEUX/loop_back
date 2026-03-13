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

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
