import type { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserNames1769010500000 implements MigrationInterface {
  name = "RemoveUserNames1769010500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "first_name" character varying(120) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "last_name" character varying(120) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT`);
  }
}
