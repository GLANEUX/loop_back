import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HealthCheck } from "./health-check.entity";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;
  let repo: jest.Mocked<Repository<HealthCheck>>;
  let loggerErrorSpy: jest.SpyInstance;
  const qb: any = {
    orderBy: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getRepositoryToken(HealthCheck),
          useValue: {
            query: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(qb),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    repo = module.get(getRepositoryToken(HealthCheck));

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-12-10T22:14:09.892Z"));
    loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    qb.orderBy.mockReset();
    qb.getOne.mockReset();
    loggerErrorSpy.mockRestore();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return status ok with db up", async () => {
    const lastRecord: HealthCheck = {
      id: 1,
      status: "up",
      checked_at: new Date("2025-12-10T22:14:09.892Z"),
      details: "Health endpoint check",
    };

    repo.query.mockResolvedValueOnce([]);
    repo.create.mockReturnValueOnce(lastRecord);
    repo.save.mockResolvedValueOnce(lastRecord);
    qb.orderBy.mockReturnValue(qb);
    qb.getOne.mockResolvedValueOnce(lastRecord);

    const result = await service.getStatus();

    expect(result).toEqual({
      status: "ok",
      db: "up",
      timestamp: "2025-12-10T22:14:09.892Z",
      responseTimeMs: 0,
      lastDbHealth: lastRecord,
    });
  });

  it("should return db down when query fails", async () => {
    repo.query.mockRejectedValueOnce(new Error("db unavailable"));

    const result = await service.getStatus();

    expect(repo.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      db: "down",
      timestamp: "2025-12-10T22:14:09.892Z",
      responseTimeMs: 0,
      lastDbHealth: null,
    });
  });
});
