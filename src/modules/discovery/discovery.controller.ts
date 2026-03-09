import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import z from "zod";
import { AuthGuard } from "@modules/auth/auth.guard";
import { DiscoveryService } from "./discovery.service";
import { swipeSchema } from "./discovery.dto";

@ApiTags("Discovery")
@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get discovery queue" })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 50, example: 20 },
  })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          pseudo: { type: "string" },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
          gender: { type: "string", nullable: true },
          birthDate: { type: "string", format: "date", nullable: true },
          bio: { type: "string", nullable: true },
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
                level: { type: "string" },
              },
            },
            nullable: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Limite invalide",
  })
  @Get("discovery/queue")
  async getQueue(@Req() request: Request, @Query("limit") limit?: string) {
    if (!request.user?.id) {
      return [];
    }
    const parsedLimit = limit === undefined ? undefined : Number(limit);
    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit <= 0)) {
      throw new BadRequestException("Limite invalide");
    }
    const take = parsedLimit ?? undefined;
    return this.discoveryService.getQueue(request.user.id, take);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Swipe on a profile" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["targetProfileId", "isLike"],
      properties: {
        targetProfileId: { type: "string", format: "uuid" },
        isLike: { type: "boolean" },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        swipeId: { type: "string", format: "uuid" },
        isLike: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
        matchCreated: { type: "boolean" },
        matchId: { type: "string", format: "uuid", nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Payload invalide",
  })
  @Post("swipes")
  async swipe(@Body() body: unknown, @Req() request: Request) {
    const parsed = swipeSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(z.treeifyError(parsed.error));
    }
    if (!request.user?.id) {
      return null;
    }

    return this.discoveryService.swipe(
      request.user.id,
      parsed.data.targetProfileId,
      parsed.data.isLike,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List liked profiles" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          profile: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              pseudo: { type: "string" },
              firstName: { type: "string", nullable: true },
              lastName: { type: "string", nullable: true },
              gender: { type: "string", nullable: true },
              birthDate: { type: "string", format: "date", nullable: true },
              bio: { type: "string", nullable: true },
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
                    level: { type: "string" },
                  },
                },
                nullable: true,
              },
            },
          },
        },
      },
    },
  })
  @Get("discovery/swipes/likes")
  async listLikes(@Req() request: Request) {
    if (!request.user?.id) {
      return [];
    }
    return this.discoveryService.listSwipes(request.user.id, true);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List refused profiles" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          profile: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              pseudo: { type: "string" },
              firstName: { type: "string", nullable: true },
              lastName: { type: "string", nullable: true },
              gender: { type: "string", nullable: true },
              birthDate: { type: "string", format: "date", nullable: true },
              bio: { type: "string", nullable: true },
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
                    level: { type: "string" },
                  },
                },
                nullable: true,
              },
            },
          },
        },
      },
    },
  })
  @Get("discovery/swipes/dislikes")
  async listDislikes(@Req() request: Request) {
    if (!request.user?.id) {
      return [];
    }
    return this.discoveryService.listSwipes(request.user.id, false);
  }
}
