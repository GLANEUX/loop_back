import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("health_check")
export class HealthCheck {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 16 })
  status!: string;

  @Column({ type: "timestamptz" })
  checked_at!: Date;

  @Column({ type: "text", nullable: true })
  details?: string;
}
