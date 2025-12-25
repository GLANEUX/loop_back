import { registerAs } from "@nestjs/config";

export default registerAs("typeorm", () => ({
  type: "postgres",
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  migrations: [__dirname + "../../db/migration/**/*{.js,.ts}"],
}));
