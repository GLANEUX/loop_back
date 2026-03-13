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
  Put,
  Patch,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response, Request } from "express";
import { AuthGuard } from "@modules/auth/auth.guard";
import { UsersService } from "./users.service";
import { ProfileMediaType } from "./profile-media.entity";

@Controller("user")
export class MediaController {
  constructor(private readonly usersService: UsersService) {}

  // --- GALLERY ENDPOINTS ---

  @Get("me/media/images")
  @UseGuards(AuthGuard)
  async getMyImages(@Req() req: Request) {
    return this.usersService.listProfileMedia(req.user!.id, ProfileMediaType.Image);
  }

  @Get("me/media/audios")
  @UseGuards(AuthGuard)
  async getMyAudios(@Req() req: Request) {
    return this.usersService.listProfileMedia(req.user!.id, ProfileMediaType.Audio);
  }

  @Get("me/media/videos")
  @UseGuards(AuthGuard)
  async getMyVideos(@Req() req: Request) {
    return this.usersService.listProfileMedia(req.user!.id, ProfileMediaType.Video);
  }

  @Post("me/media/image")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string,
    @Body("isAvatar") isAvatar?: string | boolean,
  ) {
    this.validateFile(file, ["image/jpeg", "image/png", "image/webp"], 5 * 1024 * 1024);
    
    const media = await this.usersService.addProfileMedia(
      req.user!.id,
      file.buffer,
      file.mimetype,
      ProfileMediaType.Image,
      title,
      { isAvatar: isAvatar === "true" || isAvatar === true },
    );

    return this.formatMediaResponse(media);
  }

  @Post("me/media/audio")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadAudio(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string,
    @Body("isFeatured") isFeatured?: string | boolean,
  ) {
    this.validateFile(file, ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac"], 15 * 1024 * 1024);

    const media = await this.usersService.addProfileMedia(
      req.user!.id,
      file.buffer,
      file.mimetype,
      ProfileMediaType.Audio,
      title,
      { isFeatured: isFeatured === "true" || isFeatured === true },
    );

    return this.formatMediaResponse(media);
  }

  @Post("me/media/video")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadVideo(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string,
  ) {
    this.validateFile(file, ["video/mp4", "video/webm"], 50 * 1024 * 1024);

    const media = await this.usersService.addProfileMedia(
      req.user!.id,
      file.buffer,
      file.mimetype,
      ProfileMediaType.Video,
      title,
    );

    return this.formatMediaResponse(media);
  }

  @Get("media/:id")
  async getMedia(@Param("id") id: string, @Res() res: Response) {
    const media = await this.usersService.getProfileMedia(id);
    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(media.data);
  }

  @Delete("me/media/:id")
  @UseGuards(AuthGuard)
  async deleteMedia(@Req() req: Request, @Param("id") id: string) {
    return this.usersService.deleteProfileMedia(req.user!.id, id);
  }

  // --- AVATAR ENDPOINTS ---

  @Get("me/avatar")
  @UseGuards(AuthGuard)
  async getMyAvatar(@Req() req: Request, @Res() res: Response) {
    const media = await this.usersService.getAvatarForUser(req.user!.id);
    if (!media) {
      return res.status(404).send();
    }
    res.setHeader("Content-Type", media.mimeType);
    res.send(media.data);
  }

  @Get("profiles/:profileId/avatar")
  async getProfileAvatar(@Param("profileId") profileId: string, @Res() res: Response) {
    const media = await this.usersService.getAvatarForProfile(profileId);
    if (!media) {
      return res.status(404).send();
    }
    res.setHeader("Content-Type", media.mimeType);
    res.send(media.data);
  }

  @Post("me/avatar")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async createAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const profile = await this.usersService.getProfileForUser(req.user!.id);
    if (profile.avatarMediaId) {
      throw new BadRequestException("Un avatar existe déjà. Utilisez PUT pour le remplacer.");
    }
    return this.uploadImage(req, file, "Avatar", true);
  }

  @Put("me/avatar")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async replaceAvatar(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    return this.uploadImage(req, file, "Avatar", true);
  }

  @Delete("me/avatar")
  @UseGuards(AuthGuard)
  async deleteAvatar(@Req() req: Request) {
    return this.usersService.deleteAvatar(req.user!.id);
  }

  // --- FEATURED AUDIO ENDPOINTS ---

  @Get("me/featured-audio")
  @UseGuards(AuthGuard)
  async getMyFeaturedAudio(@Req() req: Request, @Res() res: Response) {
    const profile = await this.usersService.getProfileForUser(req.user!.id);
    if (!profile.featuredAudioId) {
      return res.status(404).send();
    }
    const media = await this.usersService.getProfileMedia(profile.featuredAudioId);
    res.setHeader("Content-Type", media.mimeType);
    res.send(media.data);
  }

  @Get("profiles/:profileId/featured-audio")
  async getProfileFeaturedAudio(@Param("profileId") profileId: string, @Res() res: Response) {
    const media = await this.usersService.getFeaturedAudioForProfile(profileId);
    if (!media) {
      return res.status(404).send();
    }
    res.setHeader("Content-Type", media.mimeType);
    res.send(media.data);
  }

  @Post("me/featured-audio")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFeaturedAudio(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    return this.uploadAudio(req, file, "Featured Audio", true);
  }

  @Patch("me/featured-audio/:id")
  @UseGuards(AuthGuard)
  async setFeaturedAudio(@Req() req: Request, @Param("id") id: string) {
    return this.usersService.setFeaturedAudio(req.user!.id, id);
  }

  @Delete("me/featured-audio")
  @UseGuards(AuthGuard)
  async unsetFeaturedAudio(@Req() req: Request) {
    return this.usersService.setFeaturedAudio(req.user!.id, null);
  }

  // --- HELPERS ---

  private validateFile(file: Express.Multer.File, allowedMimeTypes: string[], maxSize: number) {
    if (!file) {
      throw new BadRequestException("Aucun fichier fourni");
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Format de fichier invalide. Attendu: ${allowedMimeTypes.join(", ")}`);
    }
    if (file.size > maxSize) {
      throw new BadRequestException(`Fichier trop volumineux (max ${maxSize / (1024 * 1024)}Mo)`);
    }
  }

  private formatMediaResponse(media: any) {
    return {
      id: media.id,
      type: media.type,
      title: media.title,
      mimeType: media.mimeType,
      order: media.order,
      createdAt: media.createdAt,
      url: `/user/media/${media.id}`,
    };
  }
}
