import type { Request, Response } from "express";

import type { Product } from "../generated/prisma/client";
import * as productService from "../services/productService";
import { paginationQuerySchema } from "../schemas/paginationSchema";
import type {
  CreateProductInput,
  ProductIdParams,
  UpdateProductInput,
} from "../schemas/productSchema";

type ProductResponse = Omit<Product, "price"> & { price: number };

/** El Decimal de Prisma no debe filtrarse al JSON: la API expone numero (D-03). */
function presentProduct(product: Product): ProductResponse {
  // Precio: Prisma Float entrega number; si viene Decimal usar toNumber
  let price: number;
  const priceVal = product.price;
  if (priceVal != null && typeof priceVal === "object" && "toNumber" in priceVal) {
    price = (priceVal as { toNumber(): number }).toNumber();
  } else {
    price = Number(priceVal);
  }
  return { ...product, price };
}

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const { items, total } = await productService.list(page, limit);

  res.status(200).json({
    data: items.map(presentProduct),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function create(
  req: Request<Record<string, never>, unknown, CreateProductInput>,
  res: Response,
): Promise<void> {
  const product = await productService.create(req.body);

  res.status(201).json({ data: presentProduct(product) });
}

export async function update(
  req: Request<ProductIdParams, unknown, UpdateProductInput>,
  res: Response,
): Promise<void> {
  const product = await productService.update(req.params.id, req.body);

  res.status(200).json({ data: presentProduct(product) });
}

export async function remove(req: Request<ProductIdParams>, res: Response): Promise<void> {
  await productService.remove(req.params.id);

  res.status(204).send();
}
