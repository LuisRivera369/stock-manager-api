import type { Product } from "../generated/prisma/client";
import { AppError } from "../errors/AppError";
import * as productRepository from "../repositories/productRepository";
import type { CreateProductInput, UpdateProductInput } from "../schemas/productSchema";

export async function list(
  page: number,
  limit: number,
): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const [items, total] = await productRepository.findActivePage(skip, limit);

  return { items, total, page, limit };
}

export async function create(input: CreateProductInput): Promise<Product> {
  const existing = await productRepository.findBySku(input.sku);

  if (existing) {
    throw new AppError(409, "CONFLICT", "El SKU ya existe");
  }

  return productRepository.create({
    name: input.name,
    sku: input.sku,
    description: input.description,
    price: input.price,
    stock: input.stock,
  });
}

export async function update(id: string, input: UpdateProductInput): Promise<Product> {
  const product = await productRepository.findById(id);

  if (!product || product.deletedAt) {
    throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
  }

  if (input.sku && input.sku !== product.sku) {
    const duplicate = await productRepository.findBySku(input.sku);

    if (duplicate) {
      throw new AppError(409, "CONFLICT", "El SKU ya existe");
    }
  }

  return productRepository.update(id, input);
}

export async function remove(id: string): Promise<void> {
  const product = await productRepository.findById(id);

  if (!product || product.deletedAt) {
    throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
  }

  await productRepository.softDelete(id);
}
