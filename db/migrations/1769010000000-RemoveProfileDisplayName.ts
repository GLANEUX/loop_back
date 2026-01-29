import type { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveProfileDisplayName1769010000000 implements MigrationInterface {
  name = "RemoveProfileDisplayName1769010000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "display_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "display_name" character varying(120) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ALTER COLUMN "display_name" DROP DEFAULT`);
  }
}
