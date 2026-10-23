import { execSync } from "node:child_process";

import { config } from "dotenv";
import { Pool } from "pg";

// Prioridad: variables del entorno (CI/sistema) > .env.test > .env.
config({ path: ".env.test" });
config();

function requireTestUrl(): string {
  const url = process.env.DATABASE_URL_TEST;

  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST es obligatoria para ejecutar los tests.\n" +
        "Definila en .env.test o pasala en la linea de comandos:\n" +
        "  DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/stock_manager_test npm test",
    );
  }

  return url;
}

function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}

async function ensureDatabase(url: string): Promise<void> {
  const dbName = databaseName(url);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const pool = new Pool({ connectionString: admin.toString() });

  try {
    const { rows } = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);

    if (rows.length === 0) {
      const quotedName = `"${dbName.replace(/"/g, '""')}"`;
      await pool.query(`CREATE DATABASE ${quotedName}`);
    }
  } finally {
    await pool.end();
  }
}

async function truncateAll(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url });

  try {
    await pool.query(
      'TRUNCATE TABLE "stock_movements", "products", "users" RESTART IDENTITY CASCADE',
    );
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const url = requireTestUrl();

  await ensureDatabase(url);

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  await truncateAll(url);
}
