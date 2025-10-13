import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`✅ API listening on http://localhost:${port}`, "Bootstrap");
}

bootstrap().catch((err) => {
  Logger.error("❌ Failed to bootstrap Nest application", err, "Bootstrap");
  process.exit(1);
});
