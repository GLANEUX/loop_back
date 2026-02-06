import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { changePasswordSchema, loginSchema, registerSchema } from "./auth.dto";
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
      required: ["email", "pseudo", "password"],
      properties: {
        email: { type: "string", format: "email", example: "test@loop.local" },
        pseudo: { type: "string", example: "loopster" },
        password: { type: "string", minLength: 8, example: "Test1234!" },
        role: { type: "string", enum: ["user", "admin"], example: "user" },
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
            pseudo: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Payload invalide",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "object" },
        error: { type: "string", example: "Requête invalide" },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Email déjà utilisé",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 409 },
        message: { type: "string", example: "Email déjà utilisé" },
        error: { type: "string", example: "Conflit" },
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
        error: { type: "string", example: "Trop de requêtes" },
      },
    },
  })
  @Post("register")
  async register(@Body() body: unknown, @Req() request: Request) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }

    return this.authService.register(
      parsed.data.email,
      parsed.data.pseudo,
      parsed.data.password,
      parsed.data.role,
      {
        userAgent: request.headers["user-agent"],
        ip: request.ip,
      },
    );
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
            pseudo: { type: "string" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Payload invalide",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "object" },
        error: { type: "string", example: "Requête invalide" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Identifiants invalides",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Identifiants invalides" },
        error: { type: "string", example: "Non autorisé" },
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
        error: { type: "string", example: "Trop de requêtes" },
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
    description: "Jeton manquant ou invalide",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Jeton manquant" },
        error: { type: "string", example: "Non autorisé" },
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

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change current user's password" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["oldPassword", "newPassword"],
      properties: {
        oldPassword: { type: "string", minLength: 8, example: "OldPass123!" },
        newPassword: { type: "string", minLength: 8, example: "NewPass123!" },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Payload invalide",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 400 },
        message: { type: "object" },
        error: { type: "string", example: "Requête invalide" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Ancien mot de passe invalide",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 401 },
        message: { type: "string", example: "Ancien mot de passe invalide" },
        error: { type: "string", example: "Non autorisé" },
      },
    },
  })
  @Post("change-password")
  async changePassword(@Body() body: unknown, @Req() request: Request) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }
    if (!request.user?.id) {
      throw new UnauthorizedException("Jeton manquant");
    }
    return this.authService.changePassword(
      request.user.id,
      parsed.data.oldPassword,
      parsed.data.newPassword,
    );
  }
}
