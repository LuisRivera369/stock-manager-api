import "dotenv/config";

import { execSync } from "node:child_process";

import { Client } from "pg";

function requireTestUrl(): string {
  const url = process.env.DATABASE_URL_TEST;

  if (!url) {
    throw new Error("DATABASE_URL_TEST es obligatoria para ejecutar los tests");
  }

  return url;
}

function databaseName(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, "");

  if (!/^[a-z0-9_]+$/i.test(name)) {
    throw new Error(`Nombre de base de datos invalido: ${name}`);
  }

  return name;
}

async function ensureDatabase(url: string): Promise<void> {
  const name = databaseName(url);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();

  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}

async function truncateAll(url: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(
      'TRUNCATE TABLE "stock_movements", "products", "users" RESTART IDENTITY CASCADE',
    );
  } finally {
    await client.end();
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
