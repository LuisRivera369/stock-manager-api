import { Router } from "express";

import * as productController from "../controllers/productController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { validateSchema } from "../middlewares/validateSchema";
import {
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
} from "../schemas/productSchema";

export const productRouter = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Lista el catalogo activo (deletedAt = null) con paginacion
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Productos activos de la pagina solicitada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *   post:
 *     tags: [Products]
 *     summary: Crea un producto
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, price]
 *             additionalProperties: false
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               sku: { type: string, maxLength: 50, description: "Se normaliza a mayusculas" }
 *               description: { type: string, maxLength: 500 }
 *               price: { type: number, exclusiveMinimum: 0 }
 *               stock: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
productRouter.get("/", productController.list);

productRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("EMPLOYEE", "ADMIN"),
  validateSchema(createProductSchema),
  productController.create,
);

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Actualiza datos del producto (el stock NO se edita aqui)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               sku: { type: string, maxLength: 50 }
 *               description: { type: string, maxLength: 500, nullable: true }
 *               price: { type: number, exclusiveMinimum: 0 }
 *     responses:
 *       200:
 *         description: Producto actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { $ref: '#/components/schemas/Product' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Products]
 *     summary: Soft delete del producto (solo ADMIN)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Producto desactivado }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
productRouter.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("EMPLOYEE", "ADMIN"),
  validateSchema(productIdParamSchema, "params"),
  validateSchema(updateProductSchema),
  productController.update,
);

productRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validateSchema(productIdParamSchema, "params"),
  productController.remove,
);
