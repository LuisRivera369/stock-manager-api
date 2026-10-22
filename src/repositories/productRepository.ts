import type { Prisma, Product } from "../generated/prisma/client";
import { prisma } from "../config/database";

type Db = Prisma.TransactionClient;

export type CreateProductData = {
  name: string;
  sku: string;
  description?: string;
  price: number;
  stock: number;
};

export type UpdateProductData = {
  name?: string;
  sku?: string;
  description?: string | null;
  price?: number;
};

export function findActivePage(skip: number, take: number): Promise<[Product[], number]> {
  return prisma.$transaction([
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);
}

export function findActiveById(id: string, db: Db = prisma): Promise<Product | null> {
  return db.product.findFirst({ where: { id, deletedAt: null } });
}

export function findById(id: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { id } });
}

export function findBySku(sku: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { sku } });
}

export function create(data: CreateProductData): Promise<Product> {
  return prisma.product.create({ data });
}

export function update(id: string, data: UpdateProductData): Promise<Product> {
  return prisma.product.update({ where: { id }, data });
}

export function softDelete(id: string): Promise<Product> {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function changeStock(id: string, delta: number, db: Db): Promise<Product> {
  return db.product.update({
    where: { id },
    data: { stock: { increment: delta } },
  });
}
