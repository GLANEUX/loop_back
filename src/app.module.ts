import { Module } from "@nestjs/common";
import { ConfigModule } from "@config/config.module";
import { ConfigService } from "@nestjs/config";
import { HealthModule } from "@modules/health/health.module";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        console.log("TypeORM Config:", configService.get("typeorm"));
        const typeormConfig = await configService.get("typeorm");
        return { ...typeormConfig };
      },
    }),
    ConfigModule,
    HealthModule,
  ],
})
export class AppModule {}
