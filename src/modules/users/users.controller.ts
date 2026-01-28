import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Req,
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
import z from "zod";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UserRole } from "./user-role.enum";
import { InstrumentLevel } from "./profile.enums";
import { UsersService } from "./users.service";

const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
    avatarUrl: z.string().trim().url().max(512).optional(),
    isPublic: z.boolean().optional(),
    genres: z.array(z.string().trim().min(1).max(120)).optional(),
    instruments: z
      .array(
        z.object({
          instrument: z.string().trim().min(1).max(120),
          level: z.nativeEnum(InstrumentLevel),
        }),
      )
      .optional(),
  })
  .strict();

@ApiTags("Users")
@Controller("user")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Soft delete current user" })
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
  @Delete("me")
  async softDeleteMe(@Req() request: Request) {
    if (request.user?.id) {
      await this.usersService.softDeleteById(request.user.id);
    }
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user (and profile for non-admin users)" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        role: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        profile: {
          type: "object",
          nullable: true,
          properties: {
            id: { type: "string", format: "uuid" },
            displayName: { type: "string" },
            bio: { type: "string", nullable: true },
            avatarUrl: { type: "string", nullable: true },
            isPublic: { type: "boolean" },
            genres: {
              type: "array",
              items: { type: "string" },
              nullable: true,
            },
            instruments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instrument: { type: "string" },
                  level: { type: "string", enum: Object.values(InstrumentLevel) },
                },
              },
              nullable: true,
            },
          },
        },
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
  @Get("me")
  async getMe(@Req() request: Request) {
    if (!request.user?.id) {
      return request.user;
    }

    const user = await this.usersService.findWithProfileById(request.user.id);
    if (!user) {
      return request.user;
    }

    const base = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    } as const;

    if (user.role === UserRole.Admin) {
      return base;
    }

    return {
      ...base,
      profile: user.profile ?? null,
    };
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's profile (non-admin only)" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        displayName: { type: "string" },
        bio: { type: "string", nullable: true },
        avatarUrl: { type: "string", nullable: true },
        isPublic: { type: "boolean" },
        genres: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        instruments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instrument: { type: "string" },
              level: { type: "string", enum: Object.values(InstrumentLevel) },
            },
          },
          nullable: true,
        },
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
  @ApiResponse({
    status: 403,
    description: "Admin accounts do not have a profile",
  })
  @Get("me/profile")
  async getMyProfile(@Req() request: Request) {
    if (!request.user?.id) {
      return null;
    }
    return this.usersService.getProfileForUser(request.user.id);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all profiles (admin only)" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          displayName: { type: "string" },
          bio: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          isPublic: { type: "boolean" },
          genres: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          instruments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                instrument: { type: "string" },
                level: { type: "string", enum: Object.values(InstrumentLevel) },
              },
            },
            nullable: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Admin only",
  })
  @Get("profiles")
  async listProfiles(@Req() request: Request) {
    if (request.user?.role !== UserRole.Admin) {
      throw new ForbiddenException("Admin only");
    }
    return this.usersService.listProfiles();
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user's profile (non-admin only)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        displayName: { type: "string" },
        bio: { type: "string" },
        avatarUrl: { type: "string", format: "uri" },
        isPublic: { type: "boolean" },
        genres: {
          type: "array",
          items: { type: "string" },
        },
        instruments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instrument: { type: "string" },
              level: { type: "string", enum: Object.values(InstrumentLevel) },
            },
          },
        },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        displayName: { type: "string" },
        bio: { type: "string", nullable: true },
        avatarUrl: { type: "string", nullable: true },
        isPublic: { type: "boolean" },
        genres: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        instruments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              instrument: { type: "string" },
              level: { type: "string", enum: Object.values(InstrumentLevel) },
            },
          },
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid payload",
  })
  @ApiResponse({
    status: 403,
    description: "Admin accounts do not have a profile",
  })
  @Patch("me/profile")
  async updateMyProfile(@Body() body: unknown, @Req() request: Request) {
    const parsed = profileUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }

    if (!request.user?.id) {
      return null;
    }

    return this.usersService.updateProfileForUser(request.user.id, parsed.data);
  }
}
