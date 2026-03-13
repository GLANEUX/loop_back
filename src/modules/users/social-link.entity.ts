import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "./profile.entity";
import { SocialPlatform } from "./profile.enums";

@Entity("social_links")
export class SocialLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "profile_id" })
  profileId!: string;

  @ManyToOne(() => Profile, (profile) => profile.socialLinks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "profile_id" })
  profile!: Profile;

  @Column({
    type: "enum",
    enum: SocialPlatform,
    default: SocialPlatform.Other,
  })
  platform!: SocialPlatform;

  @Column({ type: "varchar", length: 512 })
  url!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
