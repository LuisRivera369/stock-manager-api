export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/**
 * Error de dominio con traduccion HTTP explicita en `errorHandler`.
 * Los servicios lanzan AppError; nunca construyen respuestas.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: string[];

  constructor(statusCode: number, code: ErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
