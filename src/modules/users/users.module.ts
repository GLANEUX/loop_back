import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "@modules/auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GenreEntity } from "./genre.entity";
import { InstrumentEntity } from "./instrument.entity";
import { Profile } from "./profile.entity";
import { ProfileGenre } from "./profile-genre.entity";
import { ProfileInstrument } from "./profile-instrument.entity";
import { User } from "./user.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      GenreEntity,
      InstrumentEntity,
      ProfileGenre,
      ProfileInstrument,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
