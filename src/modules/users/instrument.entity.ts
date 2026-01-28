import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("instruments")
export class InstrumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  slug!: string;
}
