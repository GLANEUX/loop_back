import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards, forwardRef, Inject } from "@nestjs/common";
import { AuthService } from "@modules/auth/auth.service";
import { MessagesService } from "./messages.service";

@WebSocketGateway({
  namespace: "chat",
  cors: {
    origin: "*", // Adjust in production
  },
})
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  afterInit() {
    this.logger.log("Chat Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        client.disconnect();
        return;
      }

      const token = authHeader.split(" ")[1];
      const session = await this.authService.validateSessionToken(token);

      if (!session) {
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.data.user = session.user;
      
      // Join a personal room for targeted notifications
      void client.join(`user:${session.user.id}`);
      
      this.logger.log(`Client connected: ${client.id} (User: ${session.user.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_match")
  async handleJoinMatch(client: Socket, matchId: string) {
    if (!client.data.user) return;
    
    // Verify user is part of the match before allowing them to join the room
    const isMember = await this.messagesService.isMemberOfMatch(client.data.user.id, matchId);
    if (isMember) {
      void client.join(`match:${matchId}`);
      this.logger.log(`User ${client.data.user.id} joined match room ${matchId}`);
    } else {
      this.logger.warn(`User ${client.data.user.id} tried to join unauthorized match room ${matchId}`);
    }
  }

  @SubscribeMessage("leave_match")
  handleLeaveMatch(client: Socket, matchId: string) {
    void client.leave(`match:${matchId}`);
    this.logger.log(`User ${client.data.user.id} left match room ${matchId}`);
  }

  // Helper method to emit events to a match room
  emitToMatch(matchId: string, event: string, payload: any) {
    this.server.to(`match:${matchId}`).emit(event, payload);
  }

  // Helper method to emit events to a specific user
  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
