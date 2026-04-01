import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "@modules/auth/auth.module";
import { DiscoveryModule } from "@modules/discovery/discovery.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { SocialLink } from "./social-link.entity";
import { User } from "./user.entity";
import { Block } from "./block.entity";
import { CatalogController } from "./catalog.controller";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

import { ProfileMedia } from "./profile-media.entity";

import { MediaController } from "./media.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      GenreEntity,
      InstrumentEntity,
      ProfileGenre,
      ProfileInstrument,
      ProfileMedia,
      SocialLink,
      Block,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => DiscoveryModule),
  ],
  controllers: [UsersController, CatalogController, MediaController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
