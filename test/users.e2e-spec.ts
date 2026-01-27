import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RateLimitService } from "../src/modules/auth/rate-limit.service";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let rateLimitService: RateLimitService;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    rateLimitService = app.get(RateLimitService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query(`TRUNCATE TABLE "sessions", "users" RESTART IDENTITY CASCADE`);
    rateLimitService.resetAll();
  });

  it("returns current user", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send({ email: "me@loop.local", password: "Test1234!" })
      .expect(201);

    const token = registerRes.body.accessToken;
    expect(token).toBeDefined();

    const meRes = await request(server)
      .get("/user/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe("me@loop.local");
  });

  it("requires auth for /user/me", async () => {
    const server = app.getHttpServer();
    await request(server).get("/user/me").expect(401);
  });

  it("soft deletes current user", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send({ email: "del@loop.local", password: "Test1234!" })
      .expect(201);

    const token = registerRes.body.accessToken;

    await request(server).delete("/user/me").set("Authorization", `Bearer ${token}`).expect(200);

    await request(server)
      .post("/auth/login")
      .send({ email: "del@loop.local", password: "Test1234!" })
      .expect(401);
  });
});
