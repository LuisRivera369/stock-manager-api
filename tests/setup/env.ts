import "dotenv/config";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST es obligatoria para ejecutar los tests");
}

process.env.DATABASE_URL = testDatabaseUrl;
