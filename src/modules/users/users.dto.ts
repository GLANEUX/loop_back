import { ApiProperty } from "@nestjs/swagger";
import { InstrumentLevel, SocialPlatform } from "./profile.enums";

export class SocialLinkDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  profile_id!: string;

  @ApiProperty({ enum: SocialPlatform, example: SocialPlatform.Instagram })
  platform!: SocialPlatform;

  @ApiProperty({ example: "https://instagram.com/myprofile" })
  url!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ nullable: true })
  deleted_at?: Date | null;
}

export class ProfileInstrumentDto {
  @ApiProperty({ example: "Guitar" })
  instrument!: string;

  @ApiProperty({ enum: InstrumentLevel, example: InstrumentLevel.Intermediate })
  level!: InstrumentLevel;
}

export class ProfileMediaDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  profile_id!: string;

  @ApiProperty({ example: "image" })
  type!: string;

  @ApiProperty({ nullable: true, example: "My Photo" })
  title!: string | null;

  @ApiProperty({ example: "image/jpeg" })
  mime_type!: string;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ nullable: true })
  deleted_at?: Date | null;

  @ApiProperty({ example: "/user/media/uuid" })
  url!: string;
}

export class ProfileDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  user_id!: string;

  @ApiProperty({ nullable: true })
  first_name!: string | null;

  @ApiProperty({ nullable: true })
  last_name!: string | null;

  @ApiProperty({ nullable: true })
  phone_number!: string | null;

  @ApiProperty({ format: "date", nullable: true })
  birth_date!: string | null;

  @ApiProperty({ nullable: true })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({ nullable: true })
  avatar_media_id!: string | null;

  @ApiProperty({ nullable: true })
  featured_audio_id!: string | null;

  @ApiProperty()
  is_public!: boolean;

  @ApiProperty({ nullable: true })
  city!: string | null;

  @ApiProperty({ nullable: true })
  country!: string | null;

  @ApiProperty({ nullable: true })
  lat!: number | null;

  @ApiProperty({ nullable: true })
  lon!: number | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ nullable: true })
  deleted_at?: Date | null;

  // Virtual/Joined fields for API convenience
  @ApiProperty()
  hasAvatar!: boolean;

  @ApiProperty()
  isValid!: boolean;

  @ApiProperty({ type: [String] })
  missingFields!: string[];

  @ApiProperty({ type: [String] })
  genres!: string[];

  @ApiProperty({ type: [ProfileInstrumentDto] })
  instruments!: ProfileInstrumentDto[];

  @ApiProperty({ type: [SocialLinkDto] })
  social_links!: SocialLinkDto[];

  @ApiProperty({ type: [ProfileMediaDto], required: false })
  media?: ProfileMediaDto[];
}

export class UserMeDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  pseudo!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ nullable: true })
  deleted_at?: Date | null;

  @ApiProperty({ type: ProfileDto, nullable: true })
  profile!: ProfileDto | null;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ format: "date", required: false })
  birthDate?: string;

  @ApiProperty({ required: false })
  gender?: string;

  @ApiProperty({ required: false })
  bio?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  lat?: number;

  @ApiProperty({ required: false })
  lon?: number;

  @ApiProperty({ required: false })
  isPublic?: boolean;

  @ApiProperty({ type: [String], required: false })
  genres?: string[];

  @ApiProperty({ type: [ProfileInstrumentDto], required: false })
  instruments?: ProfileInstrumentDto[];

  @ApiProperty({ type: [SocialLinkDto], required: false })
  socialLinks?: SocialLinkDto[];
}
