import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AppError } from "../errors/AppError";
import type { Role } from "../generated/prisma/client";

/**
 * Debe montarse siempre despues de `authMiddleware`.
 */
export function roleMiddleware(...allowed: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Sesion requerida"));
      return;
    }

    if (!allowed.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "No tienes permisos para esta accion"));
      return;
    }

    next();
  };
}
