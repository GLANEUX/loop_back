import { Module } from "@nestjs/common";
import { ConfigModule } from "@config/config.module";
import { ConfigService } from "@nestjs/config";
import { HealthModule } from "@modules/health/health.module";
import { UsersModule } from "@modules/users/users.module";
import { AuthModule } from "@modules/auth/auth.module";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { GlobalThrottlerGuard } from "./guards/global-throttler.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const typeormConfig = configService.getOrThrow<TypeOrmModuleOptions>("typeorm");
        return { ...typeormConfig };
      },
    }),
    ConfigModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalThrottlerGuard,
    },
  ],
})
export class AppModule {}
