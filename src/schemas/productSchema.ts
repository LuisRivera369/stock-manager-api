import { z } from "zod";

const nameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(100);

const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "El SKU es obligatorio")
  .max(50)
  .regex(/^[A-Z0-9-]+$/, "El SKU solo admite letras, numeros y guiones");

const descriptionSchema = z.string().trim().max(500);

export const createProductSchema = z
  .object({
    name: nameSchema,
    sku: skuSchema,
    description: descriptionSchema.optional(),
    price: z.number().finite().positive("El precio debe ser mayor que 0"),
    stock: z.number().int().min(0, "El stock no puede ser negativo").default(0),
  })
  .strict();

/**
 * D-01: `stock` NO es editable aqui. Todo cambio de stock pasa por
 * POST /api/stock-movements para no romper la auditoria (RF-07).
 */
export const updateProductSchema = z
  .object({
    name: nameSchema.optional(),
    sku: skuSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    price: z.number().finite().positive("El precio debe ser mayor que 0").optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const productIdParamSchema = z.object({
  id: z.string().uuid("El id debe ser un UUID valido"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductIdParams = z.infer<typeof productIdParamSchema>;
