import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { InstrumentLevel } from "./profile.enums";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";

@Entity("profile_instruments")
export class ProfileInstrument {
  @PrimaryColumn({ type: "uuid", name: "profile_id" })
  profileId!: string;

  @ManyToOne(() => Profile, (profile) => profile.instruments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile!: Profile;

  @PrimaryColumn({ type: "uuid", name: "instrument_id" })
  instrumentId!: string;

  @ManyToOne(() => InstrumentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "instrument_id" })
  instrument!: InstrumentEntity;

  @Column({
    type: "enum",
    enum: InstrumentLevel,
    enumName: "instrument_level_enum",
  })
  level!: InstrumentLevel;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
