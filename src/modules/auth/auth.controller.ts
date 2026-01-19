import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { loginSchema, registerSchema } from "./auth.dto";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import z from "zod";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: unknown, @Req() request: Request) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }

    return this.authService.register(parsed.data.email, parsed.data.password, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });
  }

  @Post("login")
  async login(@Body() body: unknown, @Req() request: Request) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }

    return this.authService.login(parsed.data.email, parsed.data.password, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });
  }

  @UseGuards(AuthGuard)
  @Post("logout")
  async logout(@Req() request: Request) {
    if (request.sessionId) {
      await this.authService.logout(request.sessionId);
    }
    return { ok: true };
  }
}
