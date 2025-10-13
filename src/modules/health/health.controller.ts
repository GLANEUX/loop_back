import { Controller, Get, Req, Logger } from "@nestjs/common";
import { Request } from "express";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(@Req() req: Request) {
    this.logger.log({
      message: "Health check requested",
      requestId: req["requestId"],
    });
    return this.healthService.getStatus();
  }
}
