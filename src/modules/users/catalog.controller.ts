import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";

@ApiTags("Catalog")
@Controller()
export class CatalogController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "List all available genres" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
        },
      },
    },
  })
  @Get("genres")
  async listGenres() {
    return this.usersService.listGenres();
  }

  @ApiOperation({ summary: "List all available instruments" })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
        },
      },
    },
  })
  @Get("instruments")
  async listInstruments() {
    return this.usersService.listInstruments();
  }
}
