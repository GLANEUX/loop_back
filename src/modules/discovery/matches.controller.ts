import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@modules/auth/auth.guard";
import { DiscoveryService } from "./discovery.service";

@ApiTags("Matches")
@Controller()
export class MatchesController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List matches for current user" })
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
  @Get("matches")
  async listMatches(@Req() request: Request) {
    if (!request.user?.id) {
      return [];
    }
    return this.discoveryService.listMatches(request.user.id);
  }
}
