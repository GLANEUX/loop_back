import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "../src/modules/health/health.controller";
import { HealthService } from "../src/modules/health/health.service";

describe("HealthController (e2e)", () => {
  let app: INestApplication;
  let controller: HealthController;
  const mockServiceResponse = {
    status: "ok",
    db: "up",
    timestamp: "2025-12-10T22:14:09.892Z",
    responseTimeMs: 1,
    lastDbHealth: {
      id: 1,
      status: "up",
      checked_at: "2025-12-10T22:14:09.892Z",
      details: "Health endpoint check",
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { getStatus: jest.fn().mockResolvedValue(mockServiceResponse) },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    controller = app.get(HealthController);
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET)", async () => {
    const res = await controller.getHealth();
    expect(res).toEqual(mockServiceResponse);
  });
});
