import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
  Body,
  Patch,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response, Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UsersService } from "./users.service";
import { ProfileMediaType } from "./profile-media.entity";

@ApiTags("User Media")
@Controller("user")
export class MediaController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload a new profile media (image or audio)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        type: { type: "string", enum: Object.values(ProfileMediaType) },
        title: { type: "string" },
        isAvatar: { type: "boolean" },
        isFeatured: { type: "boolean" },
      },
      required: ["file", "type"],
    },
  })
  @Post("media")
  @UseInterceptors(FileInterceptor("file"))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body("type") type: ProfileMediaType,
    @Body("title") title: string,
    @Body("isAvatar") isAvatar: string,
    @Body("isFeatured") isFeatured: string,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException("Fichier manquant");
    }

    const options = {
      isAvatar: isAvatar === "true",
      isFeatured: isFeatured === "true",
    };

    const allowedMimeTypes =
      type === ProfileMediaType.Image
        ? ["image/jpeg", "image/png", "image/webp"]
        : ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format de fichier invalide. Attendu: ${allowedMimeTypes.join(", ")}`,
      );
    }

    const saved = await this.usersService.addProfileMedia(
      request.user!.id,
      file.buffer,
      file.mimetype,
      type,
      title,
      options,
    );

    return {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      mimeType: saved.mimeType,
      order: saved.order,
      createdAt: saved.createdAt,
      url: `/user/media/${saved.id}`,
    };
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List current user's media by type" })
  @Get("media/list/:type")
  async listMyMedia(@Param("type") type: ProfileMediaType, @Req() request: Request) {
    return this.usersService.listProfileMedia(request.user!.id, type);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set an existing audio as featured" })
  @Patch("media/featured-audio/:id")
  async setFeaturedAudio(@Param("id") mediaId: string, @Req() request: Request) {
    return this.usersService.setFeaturedAudio(request.user!.id, mediaId);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unset featured audio" })
  @Delete("media/featured-audio")
  async unsetFeaturedAudio(@Req() request: Request) {
    return this.usersService.setFeaturedAudio(request.user!.id, null);
  }

  @ApiOperation({ summary: "Get a profile media content" })
  @ApiResponse({ status: 200, description: "The media content" })
  @Get("media/:id")
  async getMedia(@Param("id") id: string, @Res() res: Response) {
    const media = await this.usersService.getProfileMedia(id);
    res.setHeader("Content-Type", media.mimeType);
    return res.send(media.data);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a profile media" })
  @Delete("media/:id")
  async deleteMedia(@Param("id") id: string, @Req() request: Request) {
    await this.usersService.deleteProfileMedia(request.user!.id, id);
    return { ok: true };
  }
}
