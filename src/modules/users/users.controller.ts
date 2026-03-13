import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import z from "zod";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UserRole } from "./user-role.enum";
import { InstrumentLevel } from "./profile.enums";
import { UsersService } from "./users.service";

const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1, "Prenom requis.").max(120, "Prenom trop long.").optional(),
    lastName: z.string().trim().min(1, "Nom requis.").max(120, "Nom trop long.").optional(),
    phoneNumber: z
      .string()
      .trim()
      .min(3, "Numero de telephone trop court.")
      .max(32, "Numero de telephone trop long.")
      .optional(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide (YYYY-MM-DD).")
      .optional(),
    gender: z.string().trim().min(1, "Genre requis.").max(32, "Genre trop long.").optional(),
    bio: z.string().trim().max(1000, "Bio trop longue.").optional(),
    isPublic: z.boolean().optional(),
    genres: z
      .array(z.string().trim().min(1, "Genre requis.").max(120, "Genre trop long."))
      .optional(),
    instruments: z
      .array(
        z.object({
          instrument: z
            .string()
            .trim()
            .min(1, "Instrument requis.")
            .max(120, "Instrument trop long."),
          level: z.nativeEnum(InstrumentLevel, {
            error: "Niveau d'instrument invalide.",
          }),
        }),
      )
      .optional(),
  })
  .strict();

const userUpdateSchema = z.object({
  email: z.string().trim().email("Email invalide.").optional(),
  pseudo: z.string().trim().min(3, "Pseudo trop court.").max(120, "Pseudo trop long.").optional(),
});

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
        pseudo: { type: "string" },
        profile: {
          type: "object",
          nullable: true,
          properties: {
            id: { type: "string", format: "uuid" },
            firstName: { type: "string", nullable: true },
            lastName: { type: "string", nullable: true },
            phoneNumber: { type: "string", nullable: true },
            birthDate: { type: "string", format: "date", nullable: true },
            gender: { type: "string", nullable: true },
            bio: { type: "string", nullable: true },
            isPublic: { type: "boolean" },
            hasAvatar: { type: "boolean" },
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
      pseudo: user.pseudo,
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
  @ApiOperation({ summary: "Update current user" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        pseudo: { type: "string" },
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
  @Patch("me")
  async updateMe(@Body() body: unknown, @Req() request: Request) {
    const parsed = userUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }

    if (!request.user?.id) {
      return null;
    }

    if (parsed.data.email) {
      await this.usersService.updateEmailById(request.user.id, parsed.data.email);
    }

    if (parsed.data.pseudo) {
      await this.usersService.updatePseudoById(request.user.id, parsed.data.pseudo);
    }

    return { ok: true };
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
        firstName: { type: "string", nullable: true },
        lastName: { type: "string", nullable: true },
        phoneNumber: { type: "string", nullable: true },
        birthDate: { type: "string", format: "date", nullable: true },
        gender: { type: "string", nullable: true },
        bio: { type: "string", nullable: true },
        isPublic: { type: "boolean" },
        hasAvatar: { type: "boolean" },
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
  @ApiResponse({
    status: 403,
    description: "Les admins n'ont pas de profil utilisateur",
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
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          phoneNumber: { type: "string", nullable: true },
          birthDate: { type: "string", format: "date", nullable: true },
          gender: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          isPublic: { type: "boolean" },
          hasAvatar: { type: "boolean" },
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
    description: "Admins uniquement",
  })
  @Get("profiles")
  async listProfiles(@Req() request: Request) {
    if (request.user?.role !== UserRole.Admin) {
      throw new ForbiddenException("Admins uniquement");
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
        firstName: { type: "string" },
        lastName: { type: "string" },
        phoneNumber: { type: "string" },
        birthDate: { type: "string", format: "date" },
        gender: { type: "string" },
        bio: { type: "string" },
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
        firstName: { type: "string", nullable: true },
        lastName: { type: "string", nullable: true },
        phoneNumber: { type: "string", nullable: true },
        birthDate: { type: "string", format: "date", nullable: true },
        gender: { type: "string", nullable: true },
        bio: { type: "string", nullable: true },
        isPublic: { type: "boolean" },
        hasAvatar: { type: "boolean" },
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
    description: "Payload invalide",
  })
  @ApiResponse({
    status: 403,
    description: "Les admins n'ont pas de profil utilisateur",
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

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user's avatar (non-admin only)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        avatar: { type: "string", format: "binary" },
      },
      required: ["avatar"],
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
    description: "Fichier d'avatar manquant",
  })
  @ApiResponse({
    status: 403,
    description: "Les admins n'ont pas de profil utilisateur",
  })
  @Patch("me/avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: memoryStorage(),
    }),
  )
  async updateMyAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Fichier d'avatar manquant");
    }
    if (!request.user?.id) {
      return null;
    }
    return this.usersService.updateAvatarForUser(request.user.id, file.buffer);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's avatar (non-admin only)" })
  @ApiProduces("application/octet-stream")
  @ApiResponse({
    status: 404,
    description: "Avatar introuvable",
  })
  @ApiResponse({
    status: 403,
    description: "Les admins n'ont pas de profil utilisateur",
  })
  @Get("me/avatar")
  async getMyAvatar(@Req() request: Request, @Res() res: Response) {
    if (!request.user?.id) {
      return res.status(404).send();
    }
    const avatar = await this.usersService.getAvatarForUser(request.user.id);
    if (!avatar) {
      throw new NotFoundException("Avatar introuvable");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(avatar);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a public profile avatar" })
  @ApiParam({ name: "id", description: "Profile id", schema: { type: "string" } })
  @ApiProduces("application/octet-stream")
  @ApiResponse({
    status: 404,
    description: "Avatar introuvable",
  })
  @Get("profiles/:id/avatar")
  async getProfileAvatar(@Param("id") profileId: string, @Res() res: Response) {
    const avatar = await this.usersService.getAvatarForProfile(profileId);
    if (!avatar) {
      throw new NotFoundException("Avatar introuvable");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(avatar);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a public profile" })
  @ApiParam({ name: "id", description: "Profile id", schema: { type: "string" } })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        firstName: { type: "string", nullable: true },
        lastName: { type: "string", nullable: true },
        phoneNumber: { type: "string", nullable: true },
        birthDate: { type: "string", format: "date", nullable: true },
        gender: { type: "string", nullable: true },
        bio: { type: "string", nullable: true },
        isPublic: { type: "boolean" },
        hasAvatar: { type: "boolean" },
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
        media: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              type: { type: "string" },
              title: { type: "string", nullable: true },
              mimeType: { type: "string" },
              order: { type: "number" },
              createdAt: { type: "string", format: "date-time" },
              url: { type: "string" },
            },
          },
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Profil introuvable",
  })
  @Get("profiles/:id")
  async getProfile(@Param("id") profileId: string) {
    return this.usersService.getProfileById(profileId);
  }
}
