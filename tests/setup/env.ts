import "dotenv/config";
import "path";
import * as fs from "fs";
import * as path from "path";

// CONFIGURATION PRIORITY (highest to lowest):
// 1. Variables de entorno del workflow (GitHub Actions, CI)
// 2. Variables de entorno del sistema
// 3. .env.test (solo para desarrollo local con SQLite)
// 4. .env (fallback general)

// Function to get env var with priority chain
function getEnvVar(key: string, fallback?: string): string | undefined {
  // 1. First check if already set (workflow CI like GitHub Actions)
  if (process.env[key]) {
    return process.env[key];
  }

  // 2. Check .env.test (for local development with SQLite)
  const envTestPath = path.resolve(".env.test");
  if (fs.existsSync(envTestPath)) {
    const testEnvContent = fs.readFileSync(envTestPath, "utf-8");
    const match = testEnvContent.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // 3. Check .env (general fallback)
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  // 4. Return fallback if provided
  return fallback;
}

// Get DATABASE_URL_TEST with priority chain
const dbTestUrl = getEnvVar("DATABASE_URL_TEST");

if (!dbTestUrl) {
  throw new Error(
    "DATABASE_URL_TEST es obligatoria para ejecutar los tests.\n" +
      "Expected: postgresql://... (from workflow) or file:./test.db (from .env.test)",
  );
}

process.env.DATABASE_URL_TEST = dbTestUrl; // Ensure it's set

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

// DATABASE_URL: use TEST URL only if it's NOT from PostgreSQL (i.e., it's SQLite)
// If it starts with postgresql, it's from the workflow - respect it as-is
if (testDatabaseUrl && !testDatabaseUrl.startsWith("postgresql")) {
  // Es SQLite desde .env.test - usarla para DATABASE_URL principal
  process.env.DATABASE_URL = testDatabaseUrl;
  // Note: No cambiemos DATABASE_URL_TEST, se usa tal cual para la conexión de tests
}
// Si ya es postgresql (del workflow), no toquemos nada - ya está configurado correctamente
