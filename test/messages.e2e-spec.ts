import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";
import { RateLimitService } from "../src/modules/auth/rate-limit.service";

describe("Messages (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let rateLimitService: RateLimitService;
  let port: number;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    port = typeof address === "string" ? 0 : (address?.port ?? 0);
    console.log(`Server listening on port ${port}`);

    dataSource = app.get(DataSource);
    rateLimitService = app.get(RateLimitService);
  });

  const sockets: Socket[] = [];

  afterAll(async () => {
    for (const socket of sockets) {
      if (socket.connected) {
        socket.disconnect();
      }
    }
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query(
      `TRUNCATE TABLE "swipes", "matches", "messages", "profiles", "sessions", "users" RESTART IDENTITY CASCADE`,
    );
    rateLimitService.resetAll();
  });

  const createUser = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, pseudo: email.split("@")[0], password: "Test1234!" });
    return {
      token: res.body.accessToken,
      profileId: res.body.user.profile?.id,
      userId: res.body.user.id,
    };
  };

  const createSocket = (token: string): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to WebSocket on port ${port}...`);
      const socket = io(`http://127.0.0.1:${port}/chat`, {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      socket.on("connect", () => {
        console.log("WebSocket connected!");
        resolve(socket);
      });
      socket.on("connect_error", (err) => {
        console.error("WebSocket connection error:", err);
        reject(err);
      });
    });
  };

  it("handles full messaging flow with real-time notifications", async () => {
    const userA = await createUser("userA@loop.local");
    const userB = await createUser("userB@loop.local");

    // Get real profile IDs
    const profileA = await request(app.getHttpServer())
      .get("/user/me/profile")
      .set("Authorization", `Bearer ${userA.token}`);
    const profileB = await request(app.getHttpServer())
      .get("/user/me/profile")
      .set("Authorization", `Bearer ${userB.token}`);

    // Create a match
    await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ targetProfileId: profileB.body.id, isLike: true });

    const matchRes = await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ targetProfileId: profileA.body.id, isLike: true });

    const matchId = matchRes.body.matchId;
    expect(matchRes.body.matchCreated).toBe(true);

    // Connect via WebSockets
    const socketA = await createSocket(userA.token);
    const socketB = await createSocket(userB.token);

    // Join match room
    socketA.emit("join_match", matchId);
    socketB.emit("join_match", matchId);

    // Wait a bit for join to complete
    await new Promise((r) => setTimeout(r, 100));

    // Prepare to receive message on socket A
    const messagePromise = new Promise<any>((resolve) => {
      socketA.on("message.new", (data) => resolve(data));
    });

    // User B sends a message
    const sendRes = await request(app.getHttpServer())
      .post(`/matches/${matchId}/messages`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ body: "Salut userA !" })
      .expect(201);

    const receivedMessage = await messagePromise;
    expect(receivedMessage.body).toBe("Salut userA !");
    expect(receivedMessage.id).toBe(sendRes.body.id);

    // User A marks as read
    const readPromise = new Promise<any>((resolve) => {
      socketB.on("message.read", (data) => resolve(data));
    });

    await request(app.getHttpServer())
      .post(`/matches/${matchId}/read`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ messageId: receivedMessage.id })
      .expect(201);

    const readNotification = await readPromise;
    expect(readNotification.matchId).toBe(matchId);
    expect(readNotification.messageId).toBe(receivedMessage.id);

    // User B updates message
    const updatePromise = new Promise<any>((resolve) => {
      socketA.on("message.updated", (data) => resolve(data));
    });

    await request(app.getHttpServer())
      .patch(`/matches/${matchId}/messages/${receivedMessage.id}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ body: "Salut userA ! (modifié)" })
      .expect(200);

    const updatedMessage = await updatePromise;
    expect(updatedMessage.body).toBe("Salut userA ! (modifié)");

    // User B deletes message
    const deletePromise = new Promise<any>((resolve) => {
      socketA.on("message.deleted", (data) => resolve(data));
    });

    await request(app.getHttpServer())
      .delete(`/matches/${matchId}/messages/${receivedMessage.id}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .expect(200);

    const deletedNotification = await deletePromise;
    expect(deletedNotification.id).toBe(receivedMessage.id);

    socketA.disconnect();
    socketB.disconnect();
  }, 10000);
});
