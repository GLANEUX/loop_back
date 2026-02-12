import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "@modules/users/users.module";
import { AuthModule } from "@modules/auth/auth.module";
import { Profile } from "@modules/users/profile.entity";
import { Swipe } from "./swipe.entity";
import { Match } from "./match.entity";
import { DiscoveryService } from "./discovery.service";
import { DiscoveryController } from "./discovery.controller";
import { MatchesController } from "./matches.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Swipe, Match, Profile]), UsersModule, AuthModule],
  providers: [DiscoveryService],
  controllers: [DiscoveryController, MatchesController],
})
export class DiscoveryModule {}
