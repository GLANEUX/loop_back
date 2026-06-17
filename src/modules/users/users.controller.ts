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
  Post,
  Query,
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
import { InstrumentLevel, SocialPlatform } from "./profile.enums";
import { UsersService } from "./users.service";
import { ProfileDto, UpdateProfileDto, UserMeDto } from "./users.dto";

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
    city: z.string().trim().max(120, "Ville trop longue.").optional(),
    country: z.string().trim().max(120, "Pays trop long.").optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
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
    socialLinks: z
      .array(
        z.object({
          platform: z.nativeEnum(SocialPlatform, {
            error: "Plateforme invalide.",
          }),
          url: z.string().trim().url("URL invalide.").max(512, "URL trop longue."),
        }),
      )
      .optional(),
  })
  .strict();

const userUpdateSchema = z.object({
  email: z.string().trim().email("Email invalide.").optional(),
  pseudo: z.string().trim().min(3, "Pseudo trop court.").max(120, "Pseudo trop long.").optional(),
});

@Controller("user")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================================
  // CATEGORY: USER ACCOUNT
  // ==========================================================

  @ApiTags("User Account")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user account details" })
  @ApiOkResponse({ type: UserMeDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      deleted_at: user.deletedAt ?? null,
    };

    if (user.role === UserRole.Admin) {
      return base;
    }

    return {
      ...base,
      profile: user.profile ?? null,
    };
  }

  @ApiTags("User Account")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user account (email, pseudo)" })
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
  @ApiResponse({ status: 400, description: "Invalid payload" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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

  @ApiTags("User Account")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Soft delete current user account" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Delete("me")
  async softDeleteMe(@Req() request: Request) {
    if (request.user?.id) {
      await this.usersService.softDeleteById(request.user.id);
    }
    return { ok: true };
  }

  // ==========================================================
  // CATEGORY: USER PROFILE
  // ==========================================================

  @ApiTags("User Profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's profile" })
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admins do not have profiles" })
  @Get("me/profile")
  async getMyProfile(@Req() request: Request) {
    if (!request.user?.id) {
      return null;
    }
    return this.usersService.getProfileForUser(request.user.id);
  }

  @ApiTags("User Profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user's profile details" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 400, description: "Invalid payload" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Admins do not have profiles" })
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

  @ApiTags("User Profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a specific public profile by ID" })
  @ApiParam({ name: "id", description: "Profile UUID", type: "string" })
  @ApiOkResponse({ type: ProfileDto })
  @ApiResponse({ status: 404, description: "Profile not found" })
  @Get("profiles/:id")
  async getProfile(@Param("id") profileId: string) {
    return this.usersService.getProfileById(profileId);
  }

  @ApiTags("User Profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all user profiles (Admin only)" })
  @ApiOkResponse({ type: [ProfileDto] })
  @ApiResponse({ status: 403, description: "Admin access only" })
  @Get("profiles")
  async listProfiles(@Req() request: Request) {
    if (request.user?.role !== UserRole.Admin) {
      throw new ForbiddenException("Admins uniquement");
    }
    return this.usersService.listProfiles();
  }

  // ==========================================================
  // CATEGORY: USER MEDIA (AVATAR SPECIFIC)
  // ==========================================================

  @ApiTags("User Media")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user's avatar" })
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
  @ApiResponse({ status: 400, description: "Missing file" })
  @ApiResponse({ status: 403, description: "Admins do not have profiles" })
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

  @ApiTags("User Media")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's avatar" })
  @ApiProduces("application/octet-stream")
  @ApiResponse({ status: 404, description: "Avatar not found" })
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

  @ApiTags("User Media")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a specific profile avatar by profile ID" })
  @ApiParam({ name: "id", description: "Profile UUID", type: "string" })
  @ApiProduces("application/octet-stream")
  @ApiResponse({ status: 404, description: "Avatar not found" })
  @Get("profiles/:id/avatar")
  async getProfileAvatar(@Param("id") profileId: string, @Res() res: Response) {
    const avatar = await this.usersService.getAvatarForProfile(profileId);
    if (!avatar) {
      throw new NotFoundException("Avatar introuvable");
    }
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(avatar);
  }

  // ==========================================================
  // CATEGORY: USER BLOCKS
  // ==========================================================

  @ApiTags("User Blocks")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Block a profile" })
  @ApiResponse({ status: 200, description: "Profile blocked successfully" })
  @Post("blocks/:id")
  async blockUser(@Param("id") profileId: string, @Req() request: Request) {
    if (!request.user?.id) return null;
    return this.usersService.blockUser(request.user.id, profileId);
  }

  @ApiTags("User Blocks")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unblock a profile" })
  @ApiResponse({ status: 200, description: "Profile unblocked successfully" })
  @Delete("blocks/:id")
  async unblockUser(@Param("id") profileId: string, @Req() request: Request) {
    if (!request.user?.id) return null;
    return this.usersService.unblockUser(request.user.id, profileId);
  }

  @ApiTags("User Blocks")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List blocked profiles",
    description:
      "Returns blocked profiles ordered by most recently blocked, each with a `blocked_at` date. Optional `search` filters by first name, last name or pseudo.",
  })
  @ApiOkResponse({ type: [ProfileDto] })
  @Get("blocks")
  async listBlockedUsers(@Req() request: Request, @Query("search") search?: string) {
    if (!request.user?.id) return [];
    return this.usersService.listBlockedUsers(request.user.id, search);
  }
}
