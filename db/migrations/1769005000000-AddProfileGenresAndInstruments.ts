import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileGenresAndInstruments1769005000000 implements MigrationInterface {
  name = "AddProfileGenresAndInstruments1769005000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "instrument_level"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "instrument"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "genres"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "genre_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "instrument_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "instrument_level_enum"`);

    await queryRunner.query(
      `CREATE TYPE "instrument_level_enum" AS ENUM ('Débutant','Intermédiaire','Avancé','Expert')`,
    );

    await queryRunner.query(
      `CREATE TABLE "instruments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "slug" character varying(120) NOT NULL,
        CONSTRAINT "UQ_instruments_name" UNIQUE ("name"),
        CONSTRAINT "UQ_instruments_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_instruments_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "genres" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "slug" character varying(120) NOT NULL,
        CONSTRAINT "UQ_genres_name" UNIQUE ("name"),
        CONSTRAINT "UQ_genres_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_genres_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "profile_instruments" (
        "profile_id" uuid NOT NULL,
        "instrument_id" uuid NOT NULL,
        "level" "instrument_level_enum" NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_profile_instruments" PRIMARY KEY ("profile_id", "instrument_id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_profile_instruments_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_instruments" ADD CONSTRAINT "FK_profile_instruments_instrument" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "profile_genres" (
        "profile_id" uuid NOT NULL,
        "genre_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_profile_genres" PRIMARY KEY ("profile_id", "genre_id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_profile_genres_profile" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_genres" ADD CONSTRAINT "FK_profile_genres_genre" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `INSERT INTO "instruments" ("name", "slug") VALUES
        ('Guitar','guitar'),
        ('Piano','piano'),
        ('Drums','drums'),
        ('Bass','bass'),
        ('Violin','violin'),
        ('Vocal','vocal'),
        ('Other','other')`,
    );

    await queryRunner.query(
      `INSERT INTO "genres" ("name", "slug") VALUES
        ('Rock','rock'),
        ('Jazz','jazz'),
        ('Pop','pop'),
        ('Electro','electro'),
        ('Classical','classical'),
        ('HipHop','hiphop')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "profile_genres"`);
    await queryRunner.query(`DROP TABLE "profile_instruments"`);
    await queryRunner.query(`DROP TABLE "genres"`);
    await queryRunner.query(`DROP TABLE "instruments"`);
    await queryRunner.query(`DROP TYPE "instrument_level_enum"`);

    await queryRunner.query(`CREATE TYPE "genre_enum" AS ENUM ('Rock','Jazz','Pop','Electro','Classical','HipHop')`);
    await queryRunner.query(
      `CREATE TYPE "instrument_enum" AS ENUM ('Guitar','Piano','Drums','Bass','Violin','Vocal','Other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "instrument_level_enum" AS ENUM ('Débutant','Intermédiaire','Avancé','Expert')`,
    );

    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "genres" "genre_enum"[]`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "instrument" "instrument_enum"`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "instrument_level" "instrument_level_enum"`,
    );
  }
}
