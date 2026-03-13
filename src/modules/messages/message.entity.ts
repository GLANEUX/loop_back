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
import { Match } from "../discovery/match.entity";
import { Profile } from "../users/profile.entity";
import { MessageType } from "./message-type.enum";

@Entity("messages")
@Index(["matchId", "createdAt"])
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match!: Match;

  @Column({ type: "uuid", name: "author_profile_id", nullable: true })
  authorProfileId!: string | null;

  @ManyToOne(() => Profile, { onDelete: "SET NULL" })
  @JoinColumn({ name: "author_profile_id" })
  authorProfile!: Profile | null;

  @Column({
    type: "enum",
    enum: MessageType,
    enumName: "message_type",
    default: MessageType.Text,
  })
  type!: MessageType;

  @Column({ type: "text" })
  body!: string;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "edited_at", nullable: true })
  editedAt!: Date | null;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt!: Date | null;
}
