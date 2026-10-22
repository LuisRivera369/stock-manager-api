import { Router } from "express";

import * as movementController from "../controllers/movementController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { validateSchema } from "../middlewares/validateSchema";
import { createMovementSchema } from "../schemas/movementSchema";

export const movementRouter = Router();

/**
 * @openapi
 * /api/stock-movements:
 *   post:
 *     tags: [Stock movements]
 *     summary: Registra una entrada o salida y actualiza el stock en una transaccion
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, type, quantity]
 *             additionalProperties: false
 *             properties:
 *               productId: { type: string, format: uuid }
 *               type: { type: string, enum: [IN, OUT] }
 *               quantity: { type: integer, minimum: 1 }
 *               reason: { type: string, maxLength: 255 }
 *     responses:
 *       201:
 *         description: Movimiento registrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/StockMovement' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   get:
 *     tags: [Stock movements]
 *     summary: Historial global de auditoria paginado (solo ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Movimientos de la pagina, del mas reciente al mas antiguo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/StockMovement' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
movementRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("EMPLOYEE", "ADMIN"),
  validateSchema(createMovementSchema),
  movementController.create,
);

movementRouter.get("/", authMiddleware, roleMiddleware("ADMIN"), movementController.list);
