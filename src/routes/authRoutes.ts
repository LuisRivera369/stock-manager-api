import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../config/env";
import * as authController from "../controllers/authController";
import { AppError } from "../errors/AppError";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateSchema } from "../middlewares/validateSchema";
import { loginSchema, registerSchema } from "../schemas/authSchema";

export const authRouter = Router();

function tooManyRequests(message: string) {
  return (_req: unknown, _res: unknown, next: (error: AppError) => void): void => {
    next(new AppError(429, "RATE_LIMITED", message));
  };
}

/** 10 intentos cada 15 minutos por IP (RNF-03, D-08). */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: tooManyRequests("Demasiados intentos de login, intentalo mas tarde"),
});

/** 5 cuentas por hora por IP: frena el registro masivo sin afectar al login (D-08). */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: tooManyRequests("Demasiados registros desde esta IP, intentalo mas tarde"),
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un usuario con rol EMPLOYEE
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             additionalProperties: false
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 72 }
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post(
  "/register",
  registerLimiter,
  validateSchema(registerSchema),
  authController.register,
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Valida credenciales y emite el JWT en una cookie HttpOnly
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Sesion iniciada; la cookie `token` viaja en Set-Cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
authRouter.post("/login", loginLimiter, validateSchema(loginSchema), authController.login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Elimina la cookie de sesion
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       204: { description: Cookie eliminada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
authRouter.post("/logout", authMiddleware, authController.logout);
