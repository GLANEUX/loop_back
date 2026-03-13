import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocalizationOnly1773413248051 implements MigrationInterface {
    name = "AddLocalizationOnly1773413248051"

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profiles" ADD "city" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "country" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "lat" double precision`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD "lon" double precision`);
        await queryRunner.query(`CREATE INDEX "IDX_profiles_lat_lon" ON "profiles" ("lat", "lon")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_profiles_lat_lon"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "lon"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "lat"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "city"`);
    }

}
