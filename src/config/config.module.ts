import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { env } from "./configuration";
import typeormConfig from "./typeorm.config";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [typeormConfig, () => env],
    }),
  ],
})
export class ConfigModule {}
