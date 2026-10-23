import "dotenv/config";

import { execSync } from "node:child_process";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

function requireTestUrl(): string {
  const url = process.env.DATABASE_URL_TEST;

  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST es obligatoria para ejecutar los tests.\n" +
        "Define la variable en tu .env.test o pássala en la línea de comandos:\n" +
        "  DATABASE_PROVIDER=sqlite DATABASE_URL=file:./test.db DATABASE_URL_TEST=file:./test.db npm run test"
    );
  }

  return url;
}

function isSqliteUrl(url: string): boolean {
  return url.startsWith("file:") || url.includes(".sqlite");
}

async function ensureDatabase(url: string): Promise<void> {
  if (isSqliteUrl(url)) {
    // SQLite: no need to create a database, just ensure the file path is valid
    return;
  }

  // PostgreSQL: create the database if it doesn't exist
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const pool = new Pool({ connectionString: admin.toString() });
  await pool.connect();

  try {
    // Extract database name from URL pathname
    const dbName = admin.pathname.replace(/^\//, "");
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rows.length === 0) {
      await pool.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await pool.end();
  }
}

async function truncateAll(url: string): Promise<void> {
  if (isSqliteUrl(url)) {
    // SQLite: just remove the old database file and let Prisma create a fresh one
    const dbPath = path.resolve(url.replace("file:", ""));
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    return;
  }

  // PostgreSQL: truncate all tables
  const pool = new Pool({ connectionString: url });

  try {
    const client = await pool.connect();
    await client.query(
      'TRUNCATE TABLE "stock_movements", "products", "users" RESTART IDENTITY CASCADE'
    );
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const url = requireTestUrl();

  await ensureDatabase(url);

  // For SQLite, remove old database file so Prisma creates a fresh one
  if (isSqliteUrl(url)) {
    const dbPath = path.resolve(url.replace("file:", ""));
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    // Run migrations after deleting the file
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
    });
    return;
  }

  // For PostgreSQL, run migrations and truncate
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  await truncateAll(url);
}