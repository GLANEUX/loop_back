import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { env } from "./configuration";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
  ],
})
export class ConfigModule {}
