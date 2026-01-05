import { config } from "dotenv";
import { DataSource } from "typeorm";
import { join } from "node:path";

config(); // charge .env.development via docker-compose

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  // si tu ajoutes des entités plus tard :
  // entities: [join(__dirname, "..", "src", "**", "*.entity.{ts,js}")],
  // Allow running migrations both from TS (dev) and compiled JS (prod)
  migrations: [join(__dirname, "migrations", "**/*.{ts,js}")],
  synchronize: false,
});

export default dataSource;
