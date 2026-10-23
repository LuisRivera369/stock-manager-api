import "dotenv/config";
import "path";
import * as fs from "fs";
import * as path from "path";

// CONFIGURATION PRIORITY:
// 1. Variables de entorno del workflow (ej. GitHub Actions setea DATABASE_URL_TEST con PostgreSQL)
// 2 .env.test solo se usa si NO hay variables de entorno (para desarrollo local con SQLite)

// Proteger las variables ya establecidas (ej. desde GitHub Actions) - NO sobrescribirlas
const protectEnvVar = (key: string) => {
  // Si ya está definida (por ejemplo, GitHub Actions), no la toques
  if (process.env[key]) {
    return;
  }
  // Solo establecer si no existe (para desarrollo local)
  const envPath = path.resolve(".env.test");
  if (fs.existsSync(envPath)) {
    const testEnvContent = fs.readFileSync(envPath, "utf-8");
    const match = testEnvContent.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match?.[1]) {
      process.env[key] = match[1].trim();
    }
  }
};

protectEnvVar("DATABASE_URL_TEST");
protectEnvVar("DATABASE_PROVIDER");

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST es obligatoria para ejecutar los tests");
}

// Usar la URL de TEST para DATABASE_URL principal solo si viene de .env.test
// Si ya vino del workflow (GitHub Actions), respétala tal cual
if (process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL_TEST.startsWith("postgresql")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
