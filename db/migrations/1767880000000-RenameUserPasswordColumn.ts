import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenameUserPasswordColumn1767880000000 implements MigrationInterface {
  name = "RenameUserPasswordColumn1767880000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash"`);
  }
}
