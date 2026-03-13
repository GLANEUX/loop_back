import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSocialLinks1773413945405 implements MigrationInterface {
    name = 'AddSocialLinks1773413945405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "social_links_platform_enum" AS ENUM('youtube', 'instagram', 'tiktok', 'soundcloud', 'spotify', 'apple_music', 'bandcamp', 'deezer', 'facebook', 'x', 'website', 'other')`);
        await queryRunner.query(`CREATE TABLE "social_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "profile_id" uuid NOT NULL, "platform" "social_links_platform_enum" NOT NULL DEFAULT 'other', "url" character varying(512) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_social_links" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "social_links" ADD CONSTRAINT "FK_social_links_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_links" DROP CONSTRAINT "FK_social_links_profile"`);
        await queryRunner.query(`DROP TABLE "social_links"`);
        await queryRunner.query(`DROP TYPE "social_links_platform_enum"`);
    }

}
