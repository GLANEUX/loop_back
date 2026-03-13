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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response, Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UsersService } from "./users.service";
import { ProfileMediaType } from "./profile-media.entity";

@Controller("user")
export class MediaController {
  constructor(private readonly usersService: UsersService) {}

  @Post("me/media")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadMedia(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("type") type: ProfileMediaType,
    @Body("title") title?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }

    if (!req.user) {
      throw new BadRequestException("Utilisateur non authentifié");
    }

    if (!Object.values(ProfileMediaType).includes(type)) {
      throw new BadRequestException("Type de média invalide (image ou audio attendu)");
    }

    // Simple validation for file size (e.g., 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Fichier trop volumineux (max 10Mo)");
    }

    const media = await this.usersService.addProfileMedia(
      req.user.id,
      file.buffer,
      file.mimetype,
      type,
      title,
    );

    return {
      id: media.id,
      type: media.type,
      title: media.title,
      mimeType: media.mimeType,
      order: media.order,
      createdAt: media.createdAt,
    };
  }

  @Get("media/:id")
  async getMedia(@Param("id") id: string, @Res() res: Response) {
    const media = await this.usersService.getProfileMedia(id);

    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
    res.send(media.data);
  }

  @Delete("me/media/:id")
  @UseGuards(AuthGuard)
  async deleteMedia(@Req() req: Request, @Param("id") id: string) {
    if (!req.user) {
      throw new BadRequestException("Utilisateur non authentifié");
    }
    return this.usersService.deleteProfileMedia(req.user.id, id);
  }
}
