import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("HealthController (e2e)", () => {
  let app: INestApplication;
  let httpRequest: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    httpRequest = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET)", async () => {
    const res = await httpRequest.get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: "ok" }));
  });
});
