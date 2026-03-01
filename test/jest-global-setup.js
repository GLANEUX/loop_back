require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

const path = require("node:path");
const dotenv = require("dotenv");

module.exports = async () => {
  console.log("Global Setup starting...");
  const envPath = path.resolve(process.cwd(), ".env.test");
  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    console.error("Error loading .env.test", result.error);
  }
  process.env.NODE_ENV = "test";
  console.log("Using DATABASE_URL:", process.env.DATABASE_URL);

  const dataSource = require("../db/data-source").default;
  console.log("Initializing DataSource...");
  await dataSource.initialize();
  console.log("DataSource initialized.");
  await dataSource.dropDatabase();
  console.log("Database dropped.");
  await dataSource.runMigrations();
  console.log("Migrations run.");
  await dataSource.destroy();
  console.log("DataSource destroyed.");
};
