import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      throw new UnauthorizedException("Jeton manquant");
    }

    const session = await this.authService.validateSessionToken(token);
    if (!session) {
      throw new UnauthorizedException("Jeton invalide ou expiré");
    }

    request.user = session.user;
    request.sessionId = session.sessionId;
    return true;
  }
}
