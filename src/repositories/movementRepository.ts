import type { MovementType, Prisma, StockMovement } from "../generated/prisma/client";
import { prisma } from "../config/database";

type Db = Prisma.TransactionClient;

export type CreateMovementData = {
  type: MovementType;
  quantity: number;
  reason?: string;
  productId: string;
  userId: string;
};

export function create(data: CreateMovementData, db: Db = prisma): Promise<StockMovement> {
  return db.stockMovement.create({ data });
}

export function findPage(skip: number, take: number): Promise<[StockMovement[], number]> {
  return prisma.$transaction([
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.stockMovement.count(),
  ]);
}
