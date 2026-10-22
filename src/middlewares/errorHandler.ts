import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../errors/AppError";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos invalidos",
        details: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      },
    });
    return;
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
  });
}
