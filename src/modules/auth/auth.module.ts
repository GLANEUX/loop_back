import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "@modules/users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RateLimitService } from "./rate-limit.service";
import { Session } from "./session.entity";

@Module({
  imports: [forwardRef(() => UsersModule), TypeOrmModule.forFeature([Session])],
  controllers: [AuthController],
  providers: [AuthService, RateLimitService],
  exports: [AuthService],
})
export class AuthModule {}
