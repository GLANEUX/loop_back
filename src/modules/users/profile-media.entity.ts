import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Profile } from "./profile.entity";

export enum ProfileMediaType {
  Image = "image",
  Audio = "audio",
}

@Entity("profile_media")
export class ProfileMedia {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "profile_id" })
  @Index()
  profileId!: string;

  @ManyToOne(() => Profile, (profile) => profile.media, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile!: Profile;

  @Column({
    type: "enum",
    enum: ProfileMediaType,
  })
  type!: ProfileMediaType;

  @Column({
    type: "bytea",
    select: false, // Don't select the data by default to keep queries fast
  })
  data!: Buffer;

  @Column({ name: "mime_type" })
  mimeType!: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ default: 0 })
  order!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
