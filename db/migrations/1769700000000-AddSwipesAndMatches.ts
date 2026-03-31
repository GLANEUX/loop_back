import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSwipesAndMatches1769700000000 implements MigrationInterface {
  name = "AddSwipesAndMatches1769700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "swipes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "from_profile_id" uuid NOT NULL,
        "to_profile_id" uuid NOT NULL,
        "is_like" boolean NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_swipes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_swipes_from_to" UNIQUE ("from_profile_id", "to_profile_id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_swipes_to_profile_id" ON "swipes" ("to_profile_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_swipes_from_profile_id" FOREIGN KEY ("from_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "swipes" ADD CONSTRAINT "FK_swipes_to_profile_id" FOREIGN KEY ("to_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "profile_a_id" uuid NOT NULL,
        "profile_b_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_matches_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_matches_profiles" UNIQUE ("profile_a_id", "profile_b_id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_matches_profile_a" ON "matches" ("profile_a_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_profile_b" ON "matches" ("profile_b_id")`);
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_profile_a_id" FOREIGN KEY ("profile_a_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_profile_b_id" FOREIGN KEY ("profile_b_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_profile_b_id"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_profile_a_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_profile_b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_matches_profile_a"`);
    await queryRunner.query(`DROP TABLE "matches"`);

    await queryRunner.query(`ALTER TABLE "swipes" DROP CONSTRAINT "FK_swipes_to_profile_id"`);
    await queryRunner.query(`ALTER TABLE "swipes" DROP CONSTRAINT "FK_swipes_from_profile_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_swipes_to_profile_id"`);
    await queryRunner.query(`DROP TABLE "swipes"`);
  }
}
