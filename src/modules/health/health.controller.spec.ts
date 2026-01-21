import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  it("returns health status", async () => {
    const mockResponse = {
      status: "ok",
      db: "up",
      timestamp: "2025-01-01T00:00:00.000Z",
      responseTimeMs: 1,
      lastDbHealth: null,
    };

    const service = { getStatus: jest.fn().mockResolvedValue(mockResponse) } as unknown as HealthService;
    const controller = new HealthController(service);

    await expect(controller.getHealth()).resolves.toEqual(mockResponse);
  });
});
