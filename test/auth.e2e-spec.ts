import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RateLimitService } from "../src/modules/auth/rate-limit.service";

describe("Auth (e2e)", () => {
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

  it("registers and logs in", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send({ email: "test@loop.local", password: "Test1234!" })
      .expect(201);

    expect(registerRes.body.accessToken).toBeDefined();
    expect(registerRes.body.user.email).toBe("test@loop.local");

    const loginRes = await request(server)
      .post("/auth/login")
      .send({ email: "test@loop.local", password: "Test1234!" })
      .expect(201);

    expect(loginRes.body.accessToken).toBeDefined();
  });

  it("rejects invalid payloads", async () => {
    const server = app.getHttpServer();

    await request(server).post("/auth/register").send({ email: "bad" }).expect(400);
    await request(server).post("/auth/login").send({ email: "bad" }).expect(400);
  });

  it("rejects duplicate email", async () => {
    const server = app.getHttpServer();

    await request(server)
      .post("/auth/register")
      .send({ email: "dup@loop.local", password: "Test1234!" })
      .expect(201);

    await request(server)
      .post("/auth/register")
      .send({ email: "dup@loop.local", password: "Test1234!" })
      .expect(409);
  });

  it("rate limits registration", async () => {
    const server = app.getHttpServer();

    for (let i = 0; i < 5; i += 1) {
      await request(server)
        .post("/auth/register")
        .send({ email: `rl${i}@loop.local`, password: "Test1234!" })
        .expect(201);
    }

    await request(server)
      .post("/auth/register")
      .send({ email: "rl5@loop.local", password: "Test1234!" })
      .expect(429);
  });

  it("rate limits login per email", async () => {
    const server = app.getHttpServer();

    await request(server)
      .post("/auth/register")
      .send({ email: "rate@loop.local", password: "Test1234!" })
      .expect(201);

    for (let i = 0; i < 5; i += 1) {
      await request(server)
        .post("/auth/login")
        .send({ email: "rate@loop.local", password: "Wrong123!" })
        .expect(401);
    }

    await request(server)
      .post("/auth/login")
      .send({ email: "rate@loop.local", password: "Wrong123!" })
      .expect(429);
  });

  it("logs out and invalidates token", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send({ email: "logout@loop.local", password: "Test1234!" })
      .expect(201);

    const token = registerRes.body.accessToken;

    await request(server)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    await request(server).get("/user/me").set("Authorization", `Bearer ${token}`).expect(401);
  });
});
