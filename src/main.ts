import { v4 as uuidv4 } from "uuid";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { env } from "@config/configuration";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = uuidv4();
    next();
  });
  await app.listen(env.PORT);
  logger.log("info", `🚀 API running on port ${env.PORT} [${env.NODE_ENV}]`);
}
bootstrap();
