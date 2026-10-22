import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "../errors/AppError";

export type ValidationSource = "body" | "params" | "query";

/**
 * Valida y REEMPLAZA la fuente por el valor parseado (coerciones, defaults,
 * normalizaciones). Un schema `.strict()` rechaza campos inesperados, lo que
 * bloquea mass assignment (por ejemplo `role` o `stock`).
 */
export function validateSchema(schema: ZodType, source: ValidationSource = "body"): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );

      next(new AppError(400, "VALIDATION_ERROR", "Datos invalidos", details));
      return;
    }

    if (source === "body") {
      req.body = result.data;
    } else {
      Object.assign(req[source], result.data);
    }

    next();
  };
}
