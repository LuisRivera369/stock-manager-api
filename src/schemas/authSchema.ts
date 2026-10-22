import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().max(255).email("Email invalido");

const passwordSchema = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres")
  .max(72, "La contrasena no puede superar 72 caracteres");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = registerSchema;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
