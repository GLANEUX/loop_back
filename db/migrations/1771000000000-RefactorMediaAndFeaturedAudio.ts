import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorMediaAndFeaturedAudio1771000000000 implements MigrationInterface {
  name = "RefactorMediaAndFeaturedAudio1771000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update ProfileMediaType enum to include 'video'
    // PostgreSQL doesn't allow direct enum update in some contexts, so we use ALTER TYPE
    await queryRunner.query(`ALTER TYPE "profile_media_type_enum" ADD VALUE IF NOT EXISTS 'video'`);

    // 2. Add avatar_media_id and featured_audio_id to profiles
    await queryRunner.query(`ALTER TABLE "profiles" ADD "avatar_media_id" uuid`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "featured_audio_id" uuid`);

    // 3. Move existing avatar binary data from profiles to profile_media
    // We select profiles that have an avatar
    const profilesWithAvatar = await queryRunner.query(`SELECT id, avatar FROM "profiles" WHERE avatar IS NOT NULL`);

    for (const profile of profilesWithAvatar) {
      // Create a new entry in profile_media for the avatar
      const mediaId = await queryRunner.query(
        `INSERT INTO "profile_media"("profile_id", "type", "data", "mime_type", "title", "order") 
         VALUES($1, 'image', $2, 'image/jpeg', 'Avatar', 0) RETURNING id`,
        [profile.id, profile.avatar]
      );

      // Update the profile to point to the new media entry
      if (mediaId && mediaId[0]) {
        await queryRunner.query(
          `UPDATE "profiles" SET "avatar_media_id" = $1 WHERE id = $2`,
          [mediaId[0].id, profile.id]
        );
      }
    }

    // 4. Add foreign key constraints
    await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_profile_avatar_media" FOREIGN KEY ("avatar_media_id") REFERENCES "profile_media"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_profile_featured_audio" FOREIGN KEY ("featured_audio_id") REFERENCES "profile_media"("id") ON DELETE SET NULL`);

    // 5. Drop the legacy avatar column
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "avatar"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add legacy avatar column
    await queryRunner.query(`ALTER TABLE "profiles" ADD "avatar" bytea`);

    // Try to restore data from profile_media back to avatar column
    await queryRunner.query(`
      UPDATE "profiles" 
      SET "avatar" = (SELECT data FROM "profile_media" WHERE id = "profiles"."avatar_media_id")
      WHERE "avatar_media_id" IS NOT NULL
    `);

    // Drop FKs and columns
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profile_featured_audio"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profile_avatar_media"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "featured_audio_id"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "avatar_media_id"`);
    
    // Note: We cannot easily remove 'video' from enum in standard migration revert without creating a new type
  }
}
