import type { StockMovement } from "../generated/prisma/client";
import { runInTransaction } from "../config/database";
import { AppError } from "../errors/AppError";
import * as movementRepository from "../repositories/movementRepository";
import * as productRepository from "../repositories/productRepository";
import type { CreateMovementInput } from "../schemas/movementSchema";

export async function list(
  page: number,
  limit: number,
): Promise<{ items: StockMovement[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const [items, total] = await movementRepository.findPage(skip, limit);

  return { items, total, page, limit };
}

/**
 * RF-07: el cambio de stock y el registro de auditoria ocurren en una sola
 * transaccion. Un OUT nunca deja stock negativo (D-06).
 */
export async function create(input: CreateMovementInput, userId: string): Promise<StockMovement> {
  return runInTransaction(async (tx) => {
    const product = await productRepository.findActiveById(input.productId, tx);

    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    }

    if (input.type === "OUT" && product.stock < input.quantity) {
      throw new AppError(409, "CONFLICT", "Stock insuficiente para la salida");
    }

    const delta = input.type === "IN" ? input.quantity : -input.quantity;
    const updated = await productRepository.changeStock(product.id, delta, tx);

    return movementRepository.create(
      {
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        productId: updated.id,
        userId,
      },
      tx,
    );
  });
}
