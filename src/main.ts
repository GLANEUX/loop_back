import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { env } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(env.PORT);
  console.log(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
}

bootstrap().catch((err) => {
  Logger.error("❌ Failed to bootstrap Nest application", err, "Bootstrap");
});
