# 03 — Seguridad

> Requisitos de RNF-03. Son verificables: si un cambio los rompe, el cambio está mal aunque los
> tests pasen.

## Gestión de secretos

- Solo `src/config/env.ts` lee `process.env`, valida con Zod y exporta un objeto tipado.
- **Excepción controlada:** `prisma.config.ts` lee `DATABASE_URL` para el CLI (proceso aparte que no ejecuta `env.ts`). Debe limitarse a esa variable, con `import "dotenv/config"` y `env("DATABASE_URL")`. El runtime nunca usa ese archivo.
- Variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `BCRYPT_ROUNDS`.
- El arranque **falla** si falta una variable requerida o `JWT_SECRET` es demasiado corto. Hoy `env.ts` exige `DATABASE_URL` y valida `PORT`/`NODE_ENV`; `JWT_SECRET` se añade en el Hito 2.
- `.env` está en `.gitignore`; solo `.env.example` se versiona, con valores de ejemplo y sin secretos reales.
- Toda variable nueva se añade a `.env.example` **y** a `env.ts` en el mismo cambio.
- Prohibido: loggear el objeto `env` completo, el token, la cookie o el hash de contraseña.

## Contraseñas

- Hash con `bcrypt`, cost 10 (constante desde `env.BCRYPT_ROUNDS`, por defecto 10).
- Nunca se devuelve `password` en ninguna respuesta ni se selecciona en queries de lectura pública.
- Comparación siempre con `bcrypt.compare`; nunca `===`.

## JWT y cookies

- Firma con `JWT_SECRET`, expiración desde `JWT_EXPIRES_IN` (por defecto `1h`).
- Payload mínimo: `{ sub: userId, role }`. Nada de email, nombre ni datos personales.
- Se emite **solo** en una cookie:

```ts
res.cookie("token", token, {
  httpOnly: true,        // obligatorio: bloquea lectura desde JS (XSS)
  secure: env.NODE_ENV === "production",
  sameSite: "lax",       // ver 06-decisions para "strict"
  path: "/",
  maxAge: ...            // alineado con la expiración del JWT
});
```

- `authMiddleware`: lee la cookie, verifica firma y expiración, adjunta `req.user = { id, role }` y
  llama a `next()`. Cualquier fallo → `401 UNAUTHORIZED`. No consulta la BD en cada request.
- `roleMiddleware(...roles)`: compara `req.user.role`; si no está autorizado → `403 FORBIDDEN`.
  Debe ejecutarse **después** de `authMiddleware`.
- Logout: `res.clearCookie("token", { httpOnly: true, secure: ..., sameSite: ... })` — con las
  mismas opciones con las que se creó, o el navegador no la borra. Debe ser idempotente.

## Cabeceras y transporte

- `helmet()` montado globalmente en `app.ts`, antes de las rutas.
- `cors` con `origin: env.CORS_ORIGIN` y `credentials: true`. Prohibido `origin: "*"` con credenciales.
- `express.json({ limit: "100kb" })` (o similar) para acotar bodies.
- `x-powered-by` deshabilitado.

## Rate limiting

- Global: 100 peticiones / 15 minutos por IP (RNF-03).
- `/api/auth/login`: 10 intentos / 15 minutos por IP.
- `/api/auth/register`: 5 cuentas / hora por IP.
- Los limitadores se declaran por ruta en `authRoutes`, no en `app.ts`, y comparten el formato de error 429.
- Respuesta al exceder: `429` con `code: "RATE_LIMITED"`, sin filtrar detalles internos.
- En `NODE_ENV=test` los limiters se omiten con `skip` para no romper la suite; la configuración de producción no cambia.
- Confiar en `app.set("trust proxy", ...)` solo si hay proxy delante (Docker Compose local: no configurar a ciegas).

## Validación y errores

- Zod valida **todo** lo que entra: `body`, `params`, `query`. Nunca `req.body` sin parsear.
- Mass assignment prohibido: los controllers pasan a los services campos explícitos, no `...req.body`.
- `role` nunca se acepta desde el cliente en registro ni en update de perfil.
- `errorHandler` centralizado: en `production` responde el mensaje genérico de la tabla de
  `02-domain-and-api.md` y **no** incluye `stack`; en desarrollo puede incluir traza.

## Checklist de seguridad para revisar un endpoint nuevo

- [ ] ¿Está la ruta detrás de `authMiddleware` si no es pública?
- [ ] ¿Está `roleMiddleware` donde el RBAC lo exige?
- [ ] ¿Valida Zod body, params y query?
- [ ] ¿La respuesta excluye `password` y cualquier dato sensible?
- [ ] ¿Los errores pasan por `errorHandler`?
- [ ] ¿La query filtra `deletedAt: null`?
- [ ] ¿El `userId` de escrituras sale de `req.user`, no del body?
- [ ] ¿Hay algo en logs que no debería estar?
