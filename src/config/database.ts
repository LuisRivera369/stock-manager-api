import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import type { Prisma } from "../generated/prisma/client";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

let adapter;

if (env.DATABASE_PROVIDER === "sqlite") {
  adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });
} else {
  adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
}

export const prisma = new PrismaClient({ adapter });

/**
 * Unica puerta a transacciones para la capa de servicios.
 * Los servicios nunca importan PrismaClient: reciben `tx` y lo pasan a los repositorios.
 */
export function runInTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(work);
}
