require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

const path = require("node:path");
const dotenv = require("dotenv");

module.exports = async () => {
  const envPath = path.resolve(process.cwd(), ".env.test");
  dotenv.config({ path: envPath });
  process.env.NODE_ENV = process.env.NODE_ENV || "test";

  const dataSource = require("../db/data-source").default;
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.destroy();
};
