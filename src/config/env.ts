import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(12).default(10),
  ADMIN_EMAIL: z.string().min(3).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Configuracion de entorno invalida -> ${details}`);
}

export const env = parsed.data;
