import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import type { Role } from "../generated/prisma/client";

function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "EMPLOYEE";
}

/**
 * Lee el JWT de la cookie HttpOnly, verifica firma y expiracion y adjunta
 * `req.user`. No consulta la base de datos en cada peticion.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.token;

  if (typeof token !== "string" || token.length === 0) {
    next(new AppError(401, "UNAUTHORIZED", "Sesion requerida"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === "string" || !isRole(payload.role) || typeof payload.sub !== "string") {
      next(new AppError(401, "UNAUTHORIZED", "Token invalido"));
      return;
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Token invalido o expirado"));
  }
}
