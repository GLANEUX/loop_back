import { Module } from "@nestjs/common";
import { ConfigModule } from "@config/config.module";
import { ConfigService } from "@nestjs/config";
import { HealthModule } from "@modules/health/health.module";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const typeormConfig = configService.getOrThrow<TypeOrmModuleOptions>("typeorm");
        console.log("TypeORM Config:", typeormConfig);
        return { ...typeormConfig };
      },
    }),
    ConfigModule,
    HealthModule,
  ],
})
export class AppModule {}
