import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfileMediaTable1770000000000 implements MigrationInterface {
  name = "CreateProfileMediaTable1770000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "profile_media_type_enum" AS ENUM('image', 'audio')`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "profile_id" uuid NOT NULL,
        "type" "profile_media_type_enum" NOT NULL,
        "data" bytea NOT NULL,
        "mime_type" varchar NOT NULL,
        "title" varchar,
        "order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_media_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_profile_media_profile_id" ON "profile_media" ("profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD CONSTRAINT "FK_profile_media_profile_id" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profile_media" DROP CONSTRAINT "FK_profile_media_profile_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_profile_media_profile_id"`);
    await queryRunner.query(`DROP TABLE "profile_media"`);
    await queryRunner.query(`DROP TYPE "profile_media_type_enum"`);
  }
}
