import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserBlocks1775040078752 implements MigrationInterface {
    name = 'AddUserBlocks1775040078752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blocker_profile_id" uuid NOT NULL, "blocked_profile_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cdaf8987df47fdb72dec9c321e" ON "blocks" ("blocked_profile_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4dfea58b47a1b72bfa3a159885" ON "blocks" ("blocker_profile_id", "blocked_profile_id") `);
        await queryRunner.query(`ALTER TABLE "blocks" ADD CONSTRAINT "FK_77fd1ece2ff374321d8f23b91cd" FOREIGN KEY ("blocker_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blocks" ADD CONSTRAINT "FK_cdaf8987df47fdb72dec9c321e3" FOREIGN KEY ("blocked_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "FK_cdaf8987df47fdb72dec9c321e3"`);
        await queryRunner.query(`ALTER TABLE "blocks" DROP CONSTRAINT "FK_77fd1ece2ff374321d8f23b91cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dfea58b47a1b72bfa3a159885"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdaf8987df47fdb72dec9c321e"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
    }

}
