import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return status ok", () => {
    const result = service.getStatus();
    expect(result.status).toBe("ok");
  });
});
