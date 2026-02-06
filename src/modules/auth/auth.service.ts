import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { UsersService } from "@modules/users/users.service";
import { UserRole } from "@modules/users/user-role.enum";
import { RateLimitService } from "./rate-limit.service";
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
    private readonly rateLimitService: RateLimitService,
  ) {}

  async register(
    email: string,
    pseudo: string,
    password: string,
    role: UserRole,
    context: AuthContext,
  ) {
    const ip = context.ip ?? "unknown";
    const registerKey = `register:${ip}`;
    const registerLimit = this.rateLimitService.hit(registerKey, 5, 60_000);
    if (!registerLimit.allowed) {
      throw new HttpException(
        "Trop de tentatives. Reessayez plus tard.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const passwordHash = hashPassword(password);
    const user = await this.usersService.createUser(email, pseudo, passwordHash, role);
    return this.createSession(user.id, user.email, user.pseudo, user.role, context);
  }

  async login(email: string, password: string, context: AuthContext) {
    const ip = context.ip ?? "unknown";
    const normalizedEmail = email.trim().toLowerCase();
    const ipKey = `login:ip:${ip}`;
    const ipEmailKey = `login:ip-email:${ip}:${normalizedEmail}`;

    if (this.rateLimitService.isLimited(ipKey, 10, 60_000)) {
      throw new HttpException(
        "Trop de tentatives. Reessayez plus tard.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (this.rateLimitService.isLimited(ipEmailKey, 5, 60_000)) {
      throw new HttpException(
        "Trop de tentatives. Reessayez plus tard.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (!user?.password) {
      this.rateLimitService.hit(ipKey, 10, 60_000);
      this.rateLimitService.hit(ipEmailKey, 5, 60_000);
      throw new UnauthorizedException("Identifiants invalides");
    }

    if (!verifyPassword(password, user.password)) {
      this.rateLimitService.hit(ipKey, 10, 60_000);
      this.rateLimitService.hit(ipEmailKey, 5, 60_000);
      throw new UnauthorizedException("Identifiants invalides");
    }

    this.rateLimitService.reset(ipKey);
    this.rateLimitService.reset(ipEmailKey);

    return this.createSession(user.id, user.email, user.pseudo, user.role, context);
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
        pseudo: session.user.pseudo,
      },
      expiresAt: session.expiresAt,
    };
  }

  async logout(sessionId: string) {
    await this.sessionRepo.softDelete(sessionId);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.password || !verifyPassword(oldPassword, user.password)) {
      throw new UnauthorizedException("Ancien mot de passe invalide");
    }

    const passwordHash = hashPassword(newPassword);
    await this.usersService.updatePasswordById(userId, passwordHash);

    return { ok: true };
  }

  async changeEmail(userId: string, newEmail: string) {
    return this.usersService.updateEmailById(userId, newEmail);
  }

  private async createSession(
    userId: string,
    email: string,
    pseudo: string,
    role: UserRole,
    context: AuthContext,
  ) {
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
        pseudo,
        role,
      },
    };
  }
}
