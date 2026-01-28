import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole } from "./user-role.enum";
import { Profile } from "./profile.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, name: "password", nullable: true })
  password?: string | null;

  @Column({ type: "varchar", length: 120, name: "first_name" })
  firstName!: string;

  @Column({ type: "varchar", length: 120, name: "last_name" })
  lastName!: string;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role",
    default: UserRole.User,
  })
  role!: UserRole;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile?: Profile | null;
}
