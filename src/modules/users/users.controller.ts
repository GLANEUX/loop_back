import { Controller, Delete, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UsersService } from "./users.service";

@Controller("user")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Delete("me")
  async softDeleteMe(@Req() request: Request) {
    if (request.user?.id) {
      await this.usersService.softDeleteById(request.user.id);
    }
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get("me")
  getMe(@Req() request: Request) {
    return request.user;
  }
}
