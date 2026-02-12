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
import { Profile } from "@modules/users/profile.entity";

@Entity("matches")
@Index(["profileAId", "profileBId"], { unique: true })
@Index(["profileAId"])
@Index(["profileBId"])
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "profile_a_id" })
  profileAId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_a_id" })
  profileA!: Profile;

  @Column({ type: "uuid", name: "profile_b_id" })
  profileBId!: string;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_b_id" })
  profileB!: Profile;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
