import "dotenv/config";
import "path";
import * as fs from "fs";
import * as path from "path";

// Cargar DATABASE_URL_TEST y DATABASE_PROVIDER de .env.test si no vienen definidos
// Esto permite que npm run test funcione automáticamente si .env.test existe
const testEnvPath = path.resolve(".env.test");

if (fs.existsSync(testEnvPath)) {
  const testEnvContent = fs.readFileSync(testEnvPath, "utf-8");
  // Extract DATABASE_URL_TEST
  const urlMatch = testEnvContent.match(/^DATABASE_URL_TEST=(.+)$/m);
  if (urlMatch?.[1] && !process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL_TEST = urlMatch[1].trim();
  }
  // Extract DATABASE_PROVIDER
  const providerMatch = testEnvContent.match(/^DATABASE_PROVIDER=(.+)$/m);
  if (providerMatch?.[1] && !process.env.DATABASE_PROVIDER) {
    process.env.DATABASE_PROVIDER = providerMatch[1].trim();
  }
}

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST es obligatoria para ejecutar los tests");
}

// Asegurarse de que DATABASE_URL esté definido para Prisma
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}
