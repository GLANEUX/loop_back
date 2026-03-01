import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessagesAndMatchPointers1769800000000 implements MigrationInterface {
  name = "AddMessagesAndMatchPointers1769800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "message_type" AS ENUM ('text', 'image', 'audio', 'video', 'system');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`);

    await queryRunner.query(
      `CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_id" uuid NOT NULL,
        "author_profile_id" uuid,
        "type" "message_type" NOT NULL DEFAULT 'text',
        "body" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "edited_at" TIMESTAMP WITH TIME ZONE,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_match_created_at" ON "messages" ("match_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_match_id" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_author_profile_id" FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "matches" ADD COLUMN "last_read_message_id_by_a" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD COLUMN "last_read_message_id_by_b" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD COLUMN "last_delivered_message_id_by_a" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD COLUMN "last_delivered_message_id_by_b" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matches" DROP COLUMN "last_delivered_message_id_by_b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP COLUMN "last_delivered_message_id_by_a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP COLUMN "last_read_message_id_by_b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP COLUMN "last_read_message_id_by_a"`,
    );

    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_author_profile_id"`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_match_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_match_created_at"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "message_type"`);
  }
}
