import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { UserRole } from "@modules/users/user-role.enum";
import { Session } from "./session.entity";
import {
  SESSION_DURATION_DAYS,
  addDays,
  generateSessionToken,
  hashIp,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./auth.utils";
import type { AuthContext, AuthSession } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  async register(email: string, password: string, context: AuthContext) {
    const passwordHash = hashPassword(password);
    const user = await this.usersService.createUser(email, passwordHash);
    return this.createSession(user.id, user.email, user.role, context);
  }

  async login(email: string, password: string, context: AuthContext) {
    const user = await this.usersService.findByEmail(email);
    if (!user?.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!verifyPassword(password, user.password)) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.createSession(user.id, user.email, user.role, context);
  }

  async validateSessionToken(token: string): Promise<AuthSession | null> {
    const tokenHash = hashToken(token);
    const session = await this.sessionRepo.findOne({
      where: { token: tokenHash, expiresAt: MoreThan(new Date()) },
      relations: ["user"],
    });

    if (!session?.user) {
      return null;
    }

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      expiresAt: session.expiresAt,
    };
  }

  async logout(sessionId: string) {
    await this.sessionRepo.softDelete(sessionId);
  }

  private async createSession(userId: string, email: string, role: UserRole, context: AuthContext) {
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = addDays(now, SESSION_DURATION_DAYS);

    const session = this.sessionRepo.create({
      userId,
      token: tokenHash,
      userAgent: context.userAgent?.slice(0, 255),
      ipHash: context.ip ? hashIp(context.ip) : null,
      expiresAt,
    });

    await this.sessionRepo.save(session);

    return {
      accessToken: rawToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: userId,
        email,
        role,
      },
    };
  }
}
