# 00 — Proyecto, alcance y hitos

> Léelo al inicio de cada sesión. Si hay conflicto con `docs/PRD.md`, gana el PRD.

## Qué es

API REST de gestión de inventario corporativo con auditoría estricta de movimientos. Un usuario
autenticado registra entradas/salidas de stock; cada cambio queda vinculado a su autor. Los
productos se desactivan con soft delete, nunca se borran físicamente.

## Usuarios y valor

- **Empleado**: mantiene productos y registra movimientos.
- **Administrador**: además elimina (soft delete) productos y consulta el historial global.

## Objetivo técnico

Backend modular y tipado de extremo a extremo, reproducible con un comando (`docker compose up`),
seguro por defecto (JWT en cookie `HttpOnly`, helmet, rate limiting) y verificable con tests.

## Hitos y criterio de aceptación

Cada hito se entrega completo y verificado antes de empezar el siguiente. No se mezclan hitos en un
mismo cambio.

### Hito 1 — Entorno, TypeScript y Docker

- `package.json`, `tsconfig.json` (`strict: true`, target ES2022, **CommonJS**), `jest.config.js`, `.gitignore`, `.env.example`.
- `src/app.ts` (Express sin `.listen`, con `/health`) y `src/server.ts` (arranque y cierre ordenado). El resto de middlewares llega en el Hito 2.
- `Dockerfile` multistage + `docker-compose.yml` con servicios `api` y `db` (PostgreSQL 15) y healthcheck de la BD.
- **Spike D-16 primero:** Prisma 7 con `moduleFormat = "cjs"` + `@prisma/adapter-pg` sobre el PostgreSQL real; confirmar `prisma.config.ts`, `generate`, un `create`/`findMany` y un test de Jest antes de construir nada más.
- Prisma inicializado: `prisma/schema.prisma` con generador `prisma-client` y salida en `src/generated/prisma`; `prisma.config.ts` con `import "dotenv/config"` y `DATABASE_URL`; los 3 modelos y 2 enums del PRD; adapter configurado en `src/config/database.ts`; primera migración aplicada y cliente generado.
- **Aceptación:** `docker compose up` levanta API + BD; `npm run typecheck` pasa; migración aplicada sin errores; un test de Jest crea y lee un registro real usando el cliente generado.
- **Estado (2026-10-22):** implementado y verificado en local con Prisma 7.10.1 sobre PostgreSQL 15: `prisma generate`, migración `init` regenerada para Postgres, `typecheck`, `build`, 49 tests en verde y `GET /health` → 200 desde `dist/`. `docker compose up --build` levanta `db`, aplica migraciones y deja la API healthy (`GET /health` y `GET /api/products` verificados). SQLite fue eliminado (D-18): el schema fija `provider = "postgresql"`.

### Hito 2 — Esqueleto Express y autenticación

- `app.ts` (sin `.listen`) y `server.ts` (con `.listen`), middlewares globales: helmet, cors con credenciales, cookie-parser, rate limit, `errorHandler`.
- `src/config/env.ts` valida variables con Zod al arrancar; `src/config/database.ts` expone el `PrismaClient` único.
- Flujo completo de auth: `userRepository` → `authService` → `authController` → `authRoutes`, con `authSchema`.
- Registro (bcrypt cost 10, rol `EMPLOYEE`), login (JWT en cookie `HttpOnly`), logout (limpia cookie).
- **Aceptación:** tests de integración de register/login/logout en verde; cookie verificable con `HttpOnly`; credenciales inválidas → 401; email duplicado → 409.
- **Estado (2026-10-22):** implementado. Helmet, CORS con credenciales, cookie-parser y rate limit global; flujo completo de auth en capas y 401/403 centralizados por `errorHandler`.

### Hito 3 — Productos, movimientos y soft delete

- CRUD de productos con exclusión de `deletedAt != null` en todas las lecturas.
- `movementService` transaccional: actualiza stock y crea `StockMovement` en la misma transacción de Prisma.
- `roleMiddleware` aplicado: create/update → `EMPLOYEE`; DELETE → `ADMIN`; historial global → `ADMIN`.
- **Aceptación:** cada cambio de stock deja exactamente un movimiento vinculado al usuario de la sesión; DELETE sin rol admin → 403; producto eliminado desaparece del catálogo pero permanece en BD.
- **Estado (2026-10-22):** implementado. `stock` no editable por PATCH (D-01), `OUT` sin stock → 409 (D-06) y seed del primer ADMIN (D-07).

### Hito 4 — Testing, Swagger y publicación

- Anotaciones OpenAPI con `swagger-jsdoc` servidas en `/api-docs`.
- Cobertura de servicios (unit, con mocks de repositorios) y rutas (integración, Supertest) de los flujos críticos.
- `README.md` con arranque local y con Docker, variables de entorno y ejemplos de uso.
- **Aceptación:** `/api-docs` renderiza todos los endpoints documentados; `npm run test` en verde; README permite arrancar desde cero sin pasos ocultos.
- **Estado (2026-10-22):** implementado. Swagger sirve las 6 rutas documentadas (con paginación); 8 suites y 49 tests en verde (unit + integración sobre `DATABASE_URL_TEST`, aislada de desarrollo); README con arranque local y Docker.

## Fuera de alcance (no implementar salvo petición explícita)

- Frontend o cualquier UI.
- Refresh tokens, revocación de JWT, recuperación de contraseña, verificación de email, MFA.
- Endpoints de administración de usuarios (listar/editar/borrar usuarios).
- Paginación, filtros, búsqueda u ordenamiento en listados (el PRD no los pide).
- Subida de archivos, imágenes, integraciones externas, colas, websockets, GraphQL, microservicios.
- Multi-tenant, i18n, métricas/observabilidad más allá de logs básicos.

Si crees que algo de esta lista hace falta, propónlo en `06-decisions.md`; no lo implementes.

## Cómo se trabaja

El protocolo operativo (lectura, plan, implementación, verificación, reporte) está en
[`05-workflow.md`](05-workflow.md). Es obligatorio para agentes humanos e IA.
