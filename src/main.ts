import { v4 as uuidv4 } from "uuid";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { env } from "@config/configuration";
import { Request, Response, NextFunction } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AnyFilesInterceptor } from "@nestjs/platform-express";

async function bootstrap() {
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger });
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.useGlobalInterceptors(new (AnyFilesInterceptor())());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = uuidv4();
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Loop API")
    .setDescription("API documentation")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(env.PORT);
  logger.log("info", `🚀 API running on port ${env.PORT} [${env.NODE_ENV}]`);
}
void bootstrap();
