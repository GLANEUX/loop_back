// src/modules/health/health.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HealthCheck } from "./health-check.entity";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(HealthCheck)
    private readonly healthRepo: Repository<HealthCheck>,
  ) {}

  async getStatus() {
    const startedAt = Date.now();
    let dbStatus: "up" | "down";
    let lastRecord: HealthCheck | null = null;

    try {
      await this.healthRepo.query("SELECT 1");

      const newRecord = this.healthRepo.create({
        status: "up",
        checked_at: new Date(),
        details: "Health endpoint check",
      });

      await this.healthRepo.save(newRecord);

      lastRecord = await this.healthRepo
        .createQueryBuilder("hc")
        .orderBy("hc.checked_at", "DESC")
        .getOne();

      dbStatus = "up";
    } catch (error) {
      this.logger.error("Health DB check error", error);
      dbStatus = "down";
    }

    return {
      status: dbStatus === "up" ? "ok" : "error",
      db: dbStatus,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      lastDbHealth: lastRecord,
    };
  }
}
