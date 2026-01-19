import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        db: { type: "string", example: "up" },
        timestamp: { type: "string", format: "date-time" },
        responseTimeMs: { type: "number" },
        lastDbHealth: { type: "object", nullable: true },
      },
    },
  })
  @SkipThrottle()
  @Get()
  async getHealth() {
    return this.healthService.getStatus();
  }
}
