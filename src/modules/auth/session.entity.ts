import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 255, unique: true })
  token!: string;

  @Column({ type: "varchar", length: 255, name: "user_agent", nullable: true })
  userAgent?: string | null;

  @Column({ type: "varchar", length: 255, name: "ip_hash", nullable: true })
  ipHash?: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
