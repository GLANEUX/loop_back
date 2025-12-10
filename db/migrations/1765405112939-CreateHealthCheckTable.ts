import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHealthCheckTable1765405112939 implements MigrationInterface {
  name = "CreateHealthCheckTable1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS health_check (
        id SERIAL PRIMARY KEY,
        status VARCHAR(16) NOT NULL,
        checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        details TEXT
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS health_check;
    `);
  }
}
