import { config } from "dotenv";
import { DataSource } from "typeorm";
import { join } from "node:path";

config(); // charge l'env du conteneur (env_file docker compose)

const isProd = process.env.NODE_ENV === "production";

// en prod, __dirname = dist/db
// en dev,  __dirname = db
const migrationsGlob = isProd
  ? join(__dirname, "migrations", "**/*.js")
  : join(__dirname, "migrations", "**/*.ts");
const entitiesGlob = isProd
  ? join(__dirname, "..", "**", "*.entity.js")
  : join(__dirname, "..", "src", "**", "*.entity.ts");

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [entitiesGlob],
  migrations: [migrationsGlob],
  synchronize: false,
});

export default dataSource;
