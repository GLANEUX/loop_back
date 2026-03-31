import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPseudoAndProfileDetails1769009000000 implements MigrationInterface {
  name = "AddUserPseudoAndProfileDetails1769009000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pseudo" character varying(120)`);
    await queryRunner.query(
      `UPDATE "users" SET "pseudo" = split_part("email", '@', 1) WHERE "pseudo" IS NULL`,
    );
    await queryRunner.query(
      `WITH ranked AS (
        SELECT id,
               pseudo,
               ROW_NUMBER() OVER (PARTITION BY pseudo ORDER BY created_at, id) AS rn
        FROM users
      )
      UPDATE users u
      SET pseudo = CASE
        WHEN ranked.rn = 1 THEN ranked.pseudo
        ELSE left(ranked.pseudo || '-' || ranked.rn, 120)
      END
      FROM ranked
      WHERE u.id = ranked.id`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "pseudo" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_pseudo" UNIQUE ("pseudo")`,
    );

    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "first_name" character varying(120)`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "last_name" character varying(120)`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "phone_number" character varying(32)`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "birth_date" date`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN "gender" character varying(32)`);

    await queryRunner.query(
      `UPDATE "profiles" p SET "first_name" = u."first_name", "last_name" = u."last_name" FROM "users" u WHERE p."user_id" = u."id" AND (p."first_name" IS NULL OR p."last_name" IS NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "birth_date"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "phone_number"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "last_name"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "first_name"`);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_pseudo"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pseudo"`);
  }
}
