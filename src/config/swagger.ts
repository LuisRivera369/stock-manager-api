import path from "node:path";

import swaggerJsdoc from "swagger-jsdoc";

// swagger-jsdoc interpreta `\` como escape: normalizamos a `/` (Windows incluido).
const routesDir = path.join(__dirname, "../routes").split(path.sep).join("/");
const routeExtension = __filename.endsWith(".ts") ? "ts" : "js";

const errorResponse = (description: string): object => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Stock Manager API",
      version: "1.1.0",
      description: "API REST de gestion de inventario con auditoria de movimientos por usuario.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Auth", description: "Registro, login y logout" },
      { name: "Products", description: "Catalogo y soft delete" },
      { name: "Stock movements", description: "Entradas, salidas y auditoria" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["ADMIN", "EMPLOYEE"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            sku: { type: "string" },
            description: { type: "string", nullable: true },
            price: { type: "number", minimum: 0 },
            stock: { type: "integer", minimum: 0 },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100 },
            total: { type: "integer", minimum: 0 },
            totalPages: { type: "integer", minimum: 0 },
          },
        },
        StockMovement: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["IN", "OUT"] },
            quantity: { type: "integer", minimum: 1 },
            reason: { type: "string", nullable: true },
            productId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        ValidationError: errorResponse("Datos de entrada invalidos"),
        Unauthorized: errorResponse("Sesion ausente, invalida o expirada"),
        Forbidden: errorResponse("El rol no tiene permisos"),
        NotFound: errorResponse("Recurso no encontrado"),
        Conflict: errorResponse("Conflicto con el estado actual"),
        RateLimited: errorResponse("Demasiadas peticiones"),
      },
    },
  },
  apis: [`${routesDir}/*.${routeExtension}`],
});
