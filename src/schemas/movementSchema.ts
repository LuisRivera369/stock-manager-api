import { z } from "zod";

export const createMovementSchema = z
  .object({
    productId: z.string().uuid("El productId debe ser un UUID valido"),
    type: z.enum(["IN", "OUT"], { message: "El tipo debe ser IN o OUT" }),
    quantity: z.number().int().positive("La cantidad debe ser mayor que 0"),
    reason: z.string().trim().max(255).optional(),
  })
  .strict();

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
