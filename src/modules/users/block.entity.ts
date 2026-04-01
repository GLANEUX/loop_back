import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Profile } from "./profile.entity";

@Entity("blocks")
@Index(["blockerProfileId", "blockedProfileId"], { unique: true })
@Index(["blockedProfileId"])
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "blocker_profile_id" })
  blockerProfileId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocker_profile_id" })
  blockerProfile!: Profile;

  @Column({ type: "uuid", name: "blocked_profile_id" })
  blockedProfileId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocked_profile_id" })
  blockedProfile!: Profile;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
