import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { RateLimitService } from "../src/modules/auth/rate-limit.service";

const registerPayload = (email: string) => ({
  email,
  pseudo: email.split("@")[0],
  password: "Test1234!",
});

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
    await dataSource.query(
      `TRUNCATE TABLE "profile_genres", "profile_instruments", "genres", "instruments", "profiles", "sessions", "users" RESTART IDENTITY CASCADE`,
    );
    rateLimitService.resetAll();
  });

  it("returns current user", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send(registerPayload("me@loop.local"))
      .expect(201);

    const token = registerRes.body.accessToken;
    expect(token).toBeDefined();

    const meRes = await request(server)
      .get("/user/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe("me@loop.local");
    expect(meRes.body.pseudo).toBe("me");
    expect(meRes.body.profile).toBeDefined();
  });

  it("requires auth for /user/me", async () => {
    const server = app.getHttpServer();
    await request(server).get("/user/me").expect(401);
  });

  it("requires auth for /user/me/profile", async () => {
    const server = app.getHttpServer();
    await request(server).get("/user/me/profile").expect(401);
  });

  it("updates profile with genres and instruments", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send(registerPayload("profile@loop.local"))
      .expect(201);

    const token = registerRes.body.accessToken;

    await request(server)
      .patch("/user/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: "+33612345678",
        birthDate: "1990-12-10",
        gender: "female",
        genres: ["Rock", "Jazz", " Rock "],
        instruments: [
          { instrument: "Guitar", level: "Intermediate" },
          { instrument: "Piano", level: "Beginner" },
        ],
      })
      .expect(200);

    const profileRes = await request(server)
      .get("/user/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(profileRes.body.firstName).toBe("Ada");
    expect(profileRes.body.lastName).toBe("Lovelace");
    expect(profileRes.body.phoneNumber).toBe("+33612345678");
    expect(profileRes.body.birthDate).toBe("1990-12-10");
    expect(profileRes.body.gender).toBe("female");
    expect(profileRes.body.genres).toEqual(["Rock", "Jazz"]);
    expect(profileRes.body.instruments).toEqual([
      { instrument: "Guitar", level: "Intermediate" },
      { instrument: "Piano", level: "Beginner" },
    ]);
  });

  it("forbids profile access for admins", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send({ ...registerPayload("admin@loop.local"), role: "admin" })
      .expect(201);

    const token = registerRes.body.accessToken;

    await request(server)
      .get("/user/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("lists profiles for admins", async () => {
    const server = app.getHttpServer();

    await request(server)
      .post("/auth/register")
      .send(registerPayload("user1@loop.local"))
      .expect(201);

    const adminRes = await request(server)
      .post("/auth/register")
      .send({ ...registerPayload("admin2@loop.local"), role: "admin" })
      .expect(201);

    const adminToken = adminRes.body.accessToken;

    const profilesRes = await request(server)
      .get("/user/profiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(profilesRes.body)).toBe(true);
    expect(profilesRes.body.length).toBe(1);
    expect(profilesRes.body[0].id).toBeDefined();
  });

  it("soft deletes current user", async () => {
    const server = app.getHttpServer();

    const registerRes = await request(server)
      .post("/auth/register")
      .send(registerPayload("del@loop.local"))
      .expect(201);

    const token = registerRes.body.accessToken;

    await request(server).delete("/user/me").set("Authorization", `Bearer ${token}`).expect(200);

    await request(server)
      .post("/auth/login")
      .send({ email: "del@loop.local", password: "Test1234!" })
      .expect(401);
  });
});
