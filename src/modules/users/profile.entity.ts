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

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id", unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 120, name: "display_name" })
  displayName!: string;

  @Column({ type: "text", nullable: true })
  bio?: string | null;

  @Column({ type: "varchar", length: 512, name: "avatar_url", nullable: true })
  avatarUrl?: string | null;

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

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
