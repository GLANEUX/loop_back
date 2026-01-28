import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("genres")
export class GenreEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  slug!: string;
}
