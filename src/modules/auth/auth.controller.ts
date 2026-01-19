import { BadRequestException, Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { loginSchema, registerSchema } from "./auth.dto";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import z from "zod";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: "Create an account",
    description: "Rate limit: 5 inscriptions par minute et par IP.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "test@loop.local" },
        password: { type: "string", minLength: 8, example: "Test1234!" },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        user: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid payload",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "object" },
        error: { type: "string", example: "Bad Request" },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Email already in use",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 409 },
        message: { type: "string", example: "Email already in use" },
        error: { type: "string", example: "Conflict" },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: "Too many attempts",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 429 },
        message: { type: "string", example: "Trop de tentatives. Reessayez plus tard." },
        error: { type: "string", example: "Too Many Requests" },
      },
    },
  })
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

  @ApiOperation({
    summary: "Login with email and password",
    description: "Rate limit: 10 essais/min/IP et 5 essais/min/IP+email.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "test@loop.local" },
        password: { type: "string", minLength: 8, example: "Test1234!" },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        user: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid payload",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "object" },
        error: { type: "string", example: "Bad Request" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Invalid credentials" },
        error: { type: "string", example: "Unauthorized" },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: "Too many attempts",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 429 },
        message: { type: "string", example: "Trop de tentatives. Reessayez plus tard." },
        error: { type: "string", example: "Too Many Requests" },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout current session" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Missing bearer token" },
        error: { type: "string", example: "Unauthorized" },
      },
    },
  })
  @Post("logout")
  async logout(@Req() request: Request) {
    if (request.sessionId) {
      await this.authService.logout(request.sessionId);
    }
    return { ok: true };
  }
}
