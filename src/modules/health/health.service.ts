import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: "ok",
      message: "Service is healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
