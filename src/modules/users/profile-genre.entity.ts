import { DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { GenreEntity } from "./genre.entity";
import { Profile } from "./profile.entity";

@Entity("profile_genres")
export class ProfileGenre {
  @PrimaryColumn({ type: "uuid", name: "profile_id" })
  profileId!: string;

  @ManyToOne(() => Profile, (profile) => profile.genres, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profile_id" })
  profile!: Profile;

  @PrimaryColumn({ type: "uuid", name: "genre_id" })
  genreId!: string;

  @ManyToOne(() => GenreEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "genre_id" })
  genre!: GenreEntity;

  @DeleteDateColumn({ type: "timestamptz", name: "deleted_at" })
  deletedAt?: Date | null;
}
