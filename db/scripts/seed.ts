import "tsconfig-paths/register";
import dataSource from "../data-source";
import { User } from "../../src/modules/users/user.entity";
import { Profile } from "../../src/modules/users/profile.entity";
import { UserRole } from "../../src/modules/users/user-role.enum";
import { hashPassword } from "../../src/modules/auth/auth.utils";
import { InstrumentEntity } from "../../src/modules/users/instrument.entity";
import { GenreEntity } from "../../src/modules/users/genre.entity";
import { ProfileInstrument } from "../../src/modules/users/profile-instrument.entity";
import { ProfileGenre } from "../../src/modules/users/profile-genre.entity";
import { InstrumentLevel } from "../../src/modules/users/profile.enums";
import { Match } from "../../src/modules/discovery/match.entity";
import { Swipe } from "../../src/modules/discovery/swipe.entity";

async function seed() {
  console.log("🌱 Seeding database...");

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  // Optional: Clear existing data (caution: destructive)
  // console.log("🗑️ Clearing existing data...");
  // await queryRunner.query('TRUNCATE TABLE "swipes", "matches", "messages", "profile_instruments", "profile_genres", "profiles", "sessions", "users", "instruments", "genres" RESTART IDENTITY CASCADE');

  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(Profile);
  const instrumentRepo = dataSource.getRepository(InstrumentEntity);
  const genreRepo = dataSource.getRepository(GenreEntity);
  const matchRepo = dataSource.getRepository(Match);
  const swipeRepo = dataSource.getRepository(Swipe);

  // 1. Seed Instruments
  console.log("🎸 Seeding instruments...");
  const instrumentsData = [
    { name: "Guitare", slug: "guitar" },
    { name: "Basse", slug: "bass" },
    { name: "Batterie", slug: "drums" },
    { name: "Piano", slug: "piano" },
    { name: "Chant", slug: "vocals" },
    { name: "Saxophone", slug: "saxophone" },
  ];

  for (const data of instrumentsData) {
    let inst = await instrumentRepo.findOneBy({ slug: data.slug });
    if (!inst) {
      inst = instrumentRepo.create(data);
      await instrumentRepo.save(inst);
    }
  }

  // 2. Seed Genres
  console.log("🎶 Seeding genres...");
  const genresData = [
    { name: "Rock", slug: "rock" },
    { name: "Jazz", slug: "jazz" },
    { name: "Pop", slug: "pop" },
    { name: "Metal", slug: "metal" },
    { name: "Blues", slug: "blues" },
    { name: "Funk", slug: "funk" },
  ];

  for (const data of genresData) {
    let genre = await genreRepo.findOneBy({ slug: data.slug });
    if (!genre) {
      genre = genreRepo.create(data);
      await genreRepo.save(genre);
    }
  }

  const allInstruments = await instrumentRepo.find();
  const allGenres = await genreRepo.find();

  // 3. Seed Users & Profiles
  console.log("👥 Seeding users...");
  const usersData = [
    {
      email: "admin@loop.local",
      pseudo: "Admin",
      password: "AdminPassword123!",
      role: UserRole.Admin,
      profile: null,
    },
    {
      email: "alice@loop.local",
      pseudo: "AliceRock",
      password: "Password123!",
      role: UserRole.User,
      firstName: "Alice",
      lastName: "Liddell",
      phoneNumber: "0601020304",
      birthDate: "1995-05-15",
      gender: "Femme",
      bio: "Bassiste passionnée de rock et de funk.",
      instruments: [{ slug: "bass", level: InstrumentLevel.Advanced }],
      genres: ["rock", "funk"],
    },
    {
      email: "bob@loop.local",
      pseudo: "BobJazz",
      password: "Password123!",
      role: UserRole.User,
      firstName: "Bob",
      lastName: "Marley",
      phoneNumber: "0611223344",
      birthDate: "1990-02-06",
      gender: "Homme",
      bio: "Pianiste de jazz cherchant à monter un trio.",
      instruments: [{ slug: "piano", level: InstrumentLevel.Professional }],
      genres: ["jazz", "blues"],
    },
    {
      email: "charlie@loop.local",
      pseudo: "CharlieDrums",
      password: "Password123!",
      role: UserRole.User,
      firstName: "Charlie",
      lastName: "Watts",
      phoneNumber: "0622334455",
      birthDate: "1988-06-02",
      gender: "Homme",
      bio: "Batteur metal mais ouvert à tout.",
      instruments: [{ slug: "drums", level: InstrumentLevel.Intermediate }],
      genres: ["metal", "rock"],
    },
    {
      email: "diana@loop.local",
      pseudo: "DianaSinger",
      password: "Password123!",
      role: UserRole.User,
      firstName: "Diana",
      lastName: "Ross",
      phoneNumber: "0633445566",
      birthDate: "1998-03-26",
      gender: "Femme",
      bio: "Chanteuse pop cherche accompagnement guitare.",
      instruments: [{ slug: "vocals", level: InstrumentLevel.Advanced }],
      genres: ["pop", "rock"],
    },
  ];

  const createdProfiles: Profile[] = [];

  for (const data of usersData) {
    let user = await userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = userRepo.create({
        email: data.email,
        pseudo: data.pseudo,
        password: hashPassword(data.password),
        role: data.role,
      });
      user = await userRepo.save(user);

      if (data.role === UserRole.User && "firstName" in data) {
        const profile = profileRepo.create({
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          birthDate: data.birthDate,
          gender: data.gender,
          bio: data.bio,
          isPublic: true,
        });
        const savedProfile = await profileRepo.save(profile);

        // Add instruments
        if ("instruments" in data && data.instruments) {
          for (const instData of data.instruments) {
            const inst = allInstruments.find((i) => i.slug === instData.slug);
            if (inst) {
              const pi = dataSource.getRepository(ProfileInstrument).create({
                profileId: savedProfile.id,
                instrumentId: inst.id,
                level: instData.level,
              });
              await dataSource.getRepository(ProfileInstrument).save(pi);
            }
          }
        }

        // Add genres
        if ("genres" in data && data.genres) {
          for (const gSlug of data.genres) {
            const genre = allGenres.find((g) => g.slug === gSlug);
            if (genre) {
              const pg = dataSource.getRepository(ProfileGenre).create({
                profileId: savedProfile.id,
                genreId: genre.id,
              });
              await dataSource.getRepository(ProfileGenre).save(pg);
            }
          }
        }

        createdProfiles.push(savedProfile);
      }
    } else {
      const p = await profileRepo.findOneBy({ userId: user.id });
      if (p) createdProfiles.push(p);
    }
  }

  // 4. Seed Matches
  console.log("🤝 Seeding matches...");
  const alice = createdProfiles.find((p) => p.firstName === "Alice");
  const bob = createdProfiles.find((p) => p.firstName === "Bob");
  const charlie = createdProfiles.find((p) => p.firstName === "Charlie");

  if (alice && bob) {
    await createMatch(alice.id, bob.id, swipeRepo, matchRepo);
  }
  if (alice && charlie) {
    await createMatch(alice.id, charlie.id, swipeRepo, matchRepo);
  }

  await queryRunner.release();
  await dataSource.destroy();
  console.log("✅ Seeding complete!");
}

async function createMatch(p1Id: string, p2Id: string, swipeRepo: any, matchRepo: any) {
  // Ensure swipes exist
  const swipes = [
    { fromProfileId: p1Id, toProfileId: p2Id, isLike: true },
    { fromProfileId: p2Id, toProfileId: p1Id, isLike: true },
  ];

  for (const s of swipes) {
    const existing = await swipeRepo.findOneBy({
      fromProfileId: s.fromProfileId,
      toProfileId: s.toProfileId,
    });
    if (!existing) {
      await swipeRepo.save(swipeRepo.create(s));
    }
  }

  // Ensure match exists
  const [idA, idB] = p1Id < p2Id ? [p1Id, p2Id] : [p2Id, p1Id];
  const existingMatch = await matchRepo.findOneBy({ profileAId: idA, profileBId: idB });
  if (!existingMatch) {
    await matchRepo.save(matchRepo.create({ profileAId: idA, profileBId: idB }));
    console.log(`Created match between ${p1Id} and ${p2Id}`);
  }
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
