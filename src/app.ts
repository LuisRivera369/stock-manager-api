import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { AppError } from "./errors/AppError";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/authRoutes";
import { movementRouter } from "./routes/movementRoutes";
import { productRouter } from "./routes/productRoutes";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, _res, next) => {
    next(new AppError(429, "RATE_LIMITED", "Demasiadas peticiones, intentalo mas tarde"));
  },
});

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(globalLimiter);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Swagger UI necesita inline scripts: se relaja solo el CSP de esta ruta.
  app.use(
    "/api-docs",
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/products", productRouter);
  app.use("/api/stock-movements", movementRouter);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, "NOT_FOUND", "Ruta no encontrada"));
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
