import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampsToProfileMedia1773493452786 implements MigrationInterface {
  name = "AddTimestampsToProfileMedia1773493452786";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profile_genres" DROP CONSTRAINT "FK_profile_genres_genre"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" DROP CONSTRAINT "FK_profile_genres_profile"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" DROP CONSTRAINT "FK_profile_instruments_instrument"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" DROP CONSTRAINT "FK_profile_instruments_profile"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_media" DROP CONSTRAINT "FK_profile_media_profile_id"`,
    );
    await queryRunner.query(`ALTER TABLE "social_links" DROP CONSTRAINT "FK_social_links_profile"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profiles_user_id"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profile_avatar_media"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profile_featured_audio"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_profile_b_id"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_profile_a_id"`);
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_author_profile_id"`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_match_id"`);
    await queryRunner.query(`ALTER TABLE "swipes" DROP CONSTRAINT "FK_swipes_to_profile_id"`);
    await queryRunner.query(`ALTER TABLE "swipes" DROP CONSTRAINT "FK_swipes_from_profile_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_profile_media_profile_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_profiles_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_profiles_lat_lon"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_profile_b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_profile_a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_match_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_swipes_to_profile_id"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "UQ_matches_profiles"`);
    await queryRunner.query(`ALTER TABLE "swipes" DROP CONSTRAINT "UQ_swipes_from_to"`);
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "profile_media" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "profile_media" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "UQ_b30f5284886a896989b8ff94223" UNIQUE ("avatar_media_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "UQ_2a422605e35fc39db57184f8f68" UNIQUE ("featured_audio_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87c18e6efe588926f8181291bd" ON "profile_media" ("profile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2202ff800ca8fca78d27d01e3d" ON "matches" ("profile_b_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5432a0cba276549a59049e522" ON "matches" ("profile_a_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7f1ad74f57b0f4028bd89e8f50" ON "matches" ("profile_a_id", "profile_b_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_325f88d9ff57ef1375fed47ad4" ON "messages" ("match_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ef59c692a39d7250da064acc6" ON "swipes" ("to_profile_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d8c7f9a949b450ca96a3c6bd0c" ON "swipes" ("from_profile_id", "to_profile_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_4d84b5557e5dce978ab88d3db11" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_d0113afc505ad99b797fd91528f" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_87b49b2ba64d0df9c287656c2b0" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_0540ee16b920426281002ca1975" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD CONSTRAINT "FK_87c18e6efe588926f8181291bd7" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_links" ADD CONSTRAINT "FK_f5fb51a7f6fbc93af70f07899ef" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_b30f5284886a896989b8ff94223" FOREIGN KEY ("avatar_media_id") REFERENCES "profile_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_2a422605e35fc39db57184f8f68" FOREIGN KEY ("featured_audio_id") REFERENCES "profile_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_e5432a0cba276549a59049e5222" FOREIGN KEY ("profile_a_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_2202ff800ca8fca78d27d01e3d3" FOREIGN KEY ("profile_b_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_5fdaf93e2a9fbc143071e7059e0" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_4fb3fd11bfa29d5112574233e72" FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_1b82857f084cea831702c354088" FOREIGN KEY ("from_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_7ef59c692a39d7250da064acc69" FOREIGN KEY ("to_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "swipes" DROP CONSTRAINT "FK_7ef59c692a39d7250da064acc69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" DROP CONSTRAINT "FK_1b82857f084cea831702c354088"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_4fb3fd11bfa29d5112574233e72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_5fdaf93e2a9fbc143071e7059e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_2202ff800ca8fca78d27d01e3d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_e5432a0cba276549a59049e5222"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_2a422605e35fc39db57184f8f68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_b30f5284886a896989b8ff94223"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_links" DROP CONSTRAINT "FK_f5fb51a7f6fbc93af70f07899ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_media" DROP CONSTRAINT "FK_87c18e6efe588926f8181291bd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" DROP CONSTRAINT "FK_0540ee16b920426281002ca1975"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" DROP CONSTRAINT "FK_87b49b2ba64d0df9c287656c2b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" DROP CONSTRAINT "FK_d0113afc505ad99b797fd91528f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" DROP CONSTRAINT "FK_4d84b5557e5dce978ab88d3db11"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_d8c7f9a949b450ca96a3c6bd0c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7ef59c692a39d7250da064acc6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_325f88d9ff57ef1375fed47ad4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7f1ad74f57b0f4028bd89e8f50"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e5432a0cba276549a59049e522"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2202ff800ca8fca78d27d01e3d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87c18e6efe588926f8181291bd"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "UQ_2a422605e35fc39db57184f8f68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "UQ_b30f5284886a896989b8ff94223"`,
    );
    await queryRunner.query(`ALTER TABLE "profile_media" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "profile_media" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "profile_media" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "UQ_swipes_from_to" UNIQUE ("from_profile_id", "to_profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "UQ_matches_profiles" UNIQUE ("profile_a_id", "profile_b_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_swipes_to_profile_id" ON "swipes" ("to_profile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_match_created_at" ON "messages" ("match_id", "created_at") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_matches_profile_a" ON "matches" ("profile_a_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_matches_profile_b" ON "matches" ("profile_b_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_profiles_lat_lon" ON "profiles" ("lat", "lon") `);
    await queryRunner.query(`CREATE INDEX "IDX_profiles_user_id" ON "profiles" ("user_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_profile_media_profile_id" ON "profile_media" ("profile_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_swipes_from_profile_id" FOREIGN KEY ("from_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_swipes_to_profile_id" FOREIGN KEY ("to_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_match_id" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_author_profile_id" FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_profile_a_id" FOREIGN KEY ("profile_a_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_profile_b_id" FOREIGN KEY ("profile_b_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_profile_featured_audio" FOREIGN KEY ("featured_audio_id") REFERENCES "profile_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_profile_avatar_media" FOREIGN KEY ("avatar_media_id") REFERENCES "profile_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_links" ADD CONSTRAINT "FK_social_links_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_media" ADD CONSTRAINT "FK_profile_media_profile_id" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_profile_instruments_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_profile_instruments_instrument" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_profile_genres_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_profile_genres_genre" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
