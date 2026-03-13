import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "../users/profile.entity";

@Entity("swipes")
@Index(["fromProfileId", "toProfileId"], { unique: true })
@Index(["toProfileId"])
export class Swipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "from_profile_id" })
  fromProfileId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_profile_id" })
  fromProfile!: Profile;

  @Column({ type: "uuid", name: "to_profile_id" })
  toProfileId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "to_profile_id" })
  toProfile!: Profile;

  // true = like, false = pass
  @Column({ type: "boolean", name: "is_like" })
  isLike!: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
