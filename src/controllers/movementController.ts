import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as movementService from "../services/movementService";
import { paginationQuerySchema } from "../schemas/paginationSchema";
import type { CreateMovementInput } from "../schemas/movementSchema";

export async function create(
  req: Request<Record<string, never>, unknown, CreateMovementInput>,
  res: Response,
): Promise<void> {
  const user = req.user;

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Sesion requerida");
  }

  const movement = await movementService.create(req.body, user.id);

  res.status(201).json({ data: movement });
}

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const { items, total } = await movementService.list(page, limit);

  res.status(200).json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
