import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { MessagesService } from "./messages.service";
import { markReadSchema, sendMessageSchema } from "./messages.dto";

const matchIdSchema = z.string().uuid();

@ApiTags("Messages")
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a message in a match" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["body"],
      properties: {
        body: { type: "string", maxLength: 2000 },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        matchId: { type: "string", format: "uuid" },
        authorProfileId: { type: "string", format: "uuid", nullable: true },
        type: { type: "string" },
        body: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        status: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Payload invalide",
  })
  @Post("matches/:matchId/messages")
  async sendMessage(
    @Param("matchId") matchId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    if (!request.user?.id) {
      return null;
    }

    const parsedMatchId = matchIdSchema.safeParse(matchId);
    if (!parsedMatchId.success) {
      throw new BadRequestException("Match invalide");
    }

    const parsedBody = sendMessageSchema.safeParse(body ?? {});
    if (!parsedBody.success) {
      throw new BadRequestException(z.treeifyError(parsedBody.error));
    }

    return this.messagesService.sendMessage(
      request.user.id,
      parsedMatchId.data,
      parsedBody.data.body,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a message in a match" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["body"],
      properties: {
        body: { type: "string", maxLength: 2000 },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        matchId: { type: "string", format: "uuid" },
        authorProfileId: { type: "string", format: "uuid", nullable: true },
        type: { type: "string" },
        body: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        editedAt: { type: "string", format: "date-time", nullable: true },
      },
    },
  })
  @Patch("matches/:matchId/messages/:messageId")
  async updateMessage(
    @Param("matchId") matchId: string,
    @Param("messageId") messageId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    if (!request.user?.id) {
      return null;
    }

    const parsedMatchId = matchIdSchema.safeParse(matchId);
    if (!parsedMatchId.success) {
      throw new BadRequestException("Match invalide");
    }

    const parsedMessageId = z.string().uuid().safeParse(messageId);
    if (!parsedMessageId.success) {
      throw new BadRequestException("Message invalide");
    }

    const parsedBody = sendMessageSchema.safeParse(body ?? {});
    if (!parsedBody.success) {
      throw new BadRequestException(z.treeifyError(parsedBody.error));
    }

    return this.messagesService.updateMessage(
      request.user.id,
      parsedMatchId.data,
      parsedMessageId.data,
      parsedBody.data.body,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a message in a match" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
  })
  @Delete("matches/:matchId/messages/:messageId")
  async deleteMessage(
    @Param("matchId") matchId: string,
    @Param("messageId") messageId: string,
    @Req() request: Request,
  ) {
    if (!request.user?.id) {
      return null;
    }

    const parsedMatchId = matchIdSchema.safeParse(matchId);
    if (!parsedMatchId.success) {
      throw new BadRequestException("Match invalide");
    }

    const parsedMessageId = z.string().uuid().safeParse(messageId);
    if (!parsedMessageId.success) {
      throw new BadRequestException("Message invalide");
    }

    return this.messagesService.deleteMessage(
      request.user.id,
      parsedMatchId.data,
      parsedMessageId.data,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List messages for a match" })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, example: 50 },
  })
  @ApiQuery({
    name: "before",
    required: false,
    schema: { type: "string", format: "date-time" },
  })
  @ApiQuery({
    name: "beforeId",
    required: false,
    schema: { type: "string", format: "uuid" },
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              matchId: { type: "string", format: "uuid" },
              authorProfileId: { type: "string", format: "uuid", nullable: true },
              type: { type: "string" },
              body: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              status: { type: "string", nullable: true },
            },
          },
        },
        nextCursor: {
          type: "object",
          nullable: true,
          properties: {
            before: { type: "string", format: "date-time" },
            beforeId: { type: "string", format: "uuid" },
          },
        },
      },
    },
  })
  @Get("matches/:matchId/messages")
  async listMessages(
    @Param("matchId") matchId: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
    @Query("beforeId") beforeId?: string,
    @Req() request?: Request,
  ) {
    if (!request?.user?.id) {
      return { messages: [], nextCursor: undefined };
    }

    const parsedMatchId = matchIdSchema.safeParse(matchId);
    if (!parsedMatchId.success) {
      throw new BadRequestException("Match invalide");
    }

    let parsedLimit: number | undefined;
    if (limit !== undefined) {
      const asNumber = Number(limit);
      if (!Number.isInteger(asNumber) || asNumber <= 0) {
        throw new BadRequestException("Limite invalide");
      }
      parsedLimit = asNumber;
    }

    let parsedBefore: Date | undefined;
    if (before) {
      const date = new Date(before);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Cursor invalide");
      }
      parsedBefore = date;
    }

    let parsedBeforeId: string | undefined;
    if (beforeId) {
      const parsed = z.string().uuid().safeParse(beforeId);
      if (!parsed.success) {
        throw new BadRequestException("Cursor invalide");
      }
      parsedBeforeId = parsed.data;
    }

    return this.messagesService.listMessages(
      request.user.id,
      parsedMatchId.data,
      parsedLimit,
      parsedBefore,
      parsedBeforeId,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark a message as read" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["messageId"],
      properties: {
        messageId: { type: "string", format: "uuid" },
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
  })
  @Post("matches/:matchId/read")
  async markRead(
    @Param("matchId") matchId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    if (!request.user?.id) {
      return null;
    }

    const parsedMatchId = matchIdSchema.safeParse(matchId);
    if (!parsedMatchId.success) {
      throw new BadRequestException("Match invalide");
    }

    const parsedBody = markReadSchema.safeParse(body ?? {});
    if (!parsedBody.success) {
      throw new BadRequestException(z.treeifyError(parsedBody.error));
    }

    return this.messagesService.markRead(
      request.user.id,
      parsedMatchId.data,
      parsedBody.data.messageId,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List message threads" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          matchId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          profile: { type: "object" },
          lastMessage: { type: "object", nullable: true },
          unreadCount: { type: "integer" },
        },
      },
    },
  })
  @Get("messages/threads")
  async listThreads(@Req() request: Request) {
    if (!request.user?.id) {
      return [];
    }

    return this.messagesService.listThreads(request.user.id);
  }
}
