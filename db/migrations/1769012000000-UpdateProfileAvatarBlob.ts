import type { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProfileAvatarBlob1769012000000 implements MigrationInterface {
  name = "UpdateProfileAvatarBlob1769012000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "avatar_url"`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "avatar" bytea`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "avatar"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "avatar_url" character varying(512)`,
    );
  }
}
