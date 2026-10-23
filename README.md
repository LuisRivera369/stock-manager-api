# Stock Manager API

API REST modular de inventario y auditoría con trazabilidad por usuario. Backend tipo
estricto con TypeScript, arquitectura en capas y segura por defecto.

## Sobre este proyecto

**Arquitectura en capas**: Seguimos el patrón `route → middleware → controller → service → repository → Prisma`.
Esto significa que:
- **Controllers** solo traducen peticiones HTTP a llamadas de servicio
- **Services** contienen la lógica de negocio y transacciones (ej. `movementService` actualiza stock y crea `StockMovement` en una sola transacción)
- **Repositories** son el único punto de acceso a la base de datos, con filtros como `deletedAt: null`
- **Routes** definen endpoints + middlewares + anotaciones Swagger, sin lógica de negocio

**Seguridad por defecto**:
- Autenticación con JWT en cookie `HttpOnly` (nunca en body/headers)
- Contraseñas siempre hash con bcrypt cost 10, nunca texto plano en logs o respuestas
- Validación estricta de entrada con Zod en todas las rutas
- Rate limiting global y headers de seguridad con Helmet
- Roles RBAC (EMPLOYEE/ADMIN) validados del token JWT
- Nunca se loguean contraseñas, tokens ni secretos

**Testing completo**:
- 49 tests unitarios e integración que cubren auth, productos y movimientos de stock
- Tests aislados con `DATABASE_URL_TEST` no afectan tus datos de desarrollo
- `npm run test` verifica todo antes de deploy

**Documentación interactiva**:
- OpenAPI servida en `/api-docs` mediante `swagger-jsdoc`
- Cada endpoint documenta resumen, auth requerida, body/params y códigos de error posibles

## Stack

- Node.js 20.19+ (probado en 24) · Express 5 · TypeScript 5.9 (`strict`)
- Prisma ORM 7 (`prisma-client`, salida CommonJS) + PostgreSQL 15 (`@prisma/adapter-pg`)
- Zod 4 (validación y tipos inferidos)
- bcrypt · jsonwebtoken · helmet · cors · express-rate-limit · cookie-parser
- Jest 30 + ts-jest + Supertest
- ESLint 10 (flat config) + Prettier 3
- Swagger UI en `/api-docs`
- Docker + Docker Compose

## Arranque con Docker

```bash
cp .env.example .env      # ajusta JWT_SECRET y ADMIN_PASSWORD
docker compose up --build
```

Levanta PostgreSQL 15, aplica migraciones (`prisma migrate deploy`) y arranca la API en
`http://localhost:3000`. Documentacion interactiva en `/api-docs`.

Crea el primer administrador (y datos de ejemplo). Usa el target `migrate` porque es el que incluye
la CLI de Prisma; la imagen de produccion no instala devDependencies:

```bash
docker compose run --rm migrate npx prisma db seed
```

## Arranque local

```bash
npm install
cp .env.example .env      # apunta DATABASE_URL a tu PostgreSQL
npm run prisma:migrate
npm run prisma:seed       # opcional: primer ADMIN desde ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev
```

## Variables de entorno

| Variable | Para que | Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | Runtime y CLI de Prisma | `postgresql://user:pass@host:5432/stock_manager` |
| `DATABASE_URL_TEST` | Suite de tests (se crea y migra sola) | `postgresql://user:pass@host:5432/stock_manager_test` |
| `JWT_SECRET` | Firma del JWT (minimo 32 caracteres) | cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Vida del token en segundos | `3600` |
| `CORS_ORIGIN` | Origen permitido con credenciales | `http://localhost:3000` |
| `BCRYPT_ROUNDS` | Coste de bcrypt (10–12) | `10` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo para `prisma:seed` | — |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales del contenedor `db` de Compose | `postgres` / `postgres` / `stock_manager` |

`DATABASE_URL` es una sola cadena (lo que consumen Prisma y el driver `pg`). Las credenciales del
contenedor son variables aparte porque Postgres las necesita al inicializarse; Compose construye el
`DATABASE_URL` del API a partir de ellas.

## Scripts

| Script | Que hace |
| :--- | :--- |
| `npm run dev` | Servidor con recarga (`tsx watch`) |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta el build |
| `npm run typecheck` | `tsc --noEmit` (incluye tests) |
| `npm run lint` / `npm run lint:fix` | ESLint sobre todo el repo |
| `npm run format` / `npm run format:check` | Prettier |
| `npm test` / `npm run test:cov` | Jest (unit + integracion) |
| `npm run prisma:generate` | Regenera el cliente (v7 no lo hace solo) |
| `npm run prisma:migrate` | `migrate dev` + `generate` |
| `npm run prisma:seed` | `prisma db seed` |

## Motor de base de datos

PostgreSQL es el único motor soportado. El `provider` de Prisma es estático en el schema y el
cliente generado queda atado a él, por lo que no se cambia de motor con una variable de entorno
(ver `docs/context/06-decisions.md`, D-02 y D-18).

## Endpoints

| Metodo | Ruta | Acceso | Descripcion |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Publico | Registro (rol `EMPLOYEE` forzado) |
| POST | `/api/auth/login` | Publico | JWT en cookie `HttpOnly` |
| POST | `/api/auth/logout` | Autenticado | Elimina la cookie |
| GET | `/api/products` | Publico | Catalogo activo paginado (`?page`, `?limit`) |
| POST | `/api/products` | EMPLOYEE / ADMIN | Crea producto |
| PATCH | `/api/products/:id` | EMPLOYEE / ADMIN | Edita datos (no `stock`) |
| DELETE | `/api/products/:id` | ADMIN | Soft delete |
| POST | `/api/stock-movements` | EMPLOYEE / ADMIN | Entrada/salida transaccional |
| GET | `/api/stock-movements` | ADMIN | Historial global paginado (`?page`, `?limit`) |
| GET | `/health` | Publico | Healthcheck |

Respuestas: `{ "data": ... }` en exito (los listados añaden `meta` con `page`, `limit`, `total` y `totalPages`); `{ "error": { "code", "message", "details?" } }` en error.

## Estructura

```text
src/
├── @types/          augmentations de Express (req.user)
├── config/          env validado, Prisma + adapter, Swagger
├── controllers/     traduccion HTTP
├── services/        reglas de negocio y transacciones
├── repositories/    unico acceso a Prisma
├── routes/          endpoints + anotaciones OpenAPI
├── middlewares/     auth, roles, validacion, errores
├── schemas/         Zod + tipos inferidos
├── errors/          AppError tipado
├── generated/       cliente de Prisma (no versionado)
├── app.ts           Express sin listen
└── server.ts        arranque y cierre ordenado
```

Reglas detalladas para humanos y agentes: `AGENTS.md` y `docs/context/`.

## Tests

```bash
npm test
```

- **Unit**: servicios con repositorios mockeados (`tests/unit`).
- **Integracion**: Supertest contra la app y PostgreSQL real (`tests/integration`).

La suite usa `DATABASE_URL_TEST`: `globalSetup` crea la base si no existe, aplica
`prisma migrate deploy` y la trunca antes de empezar. Durante los tests `DATABASE_URL` se fuerza a
la URL de test, asi que tus datos de desarrollo quedan intactos.

## CI

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada pull request:
`npm ci`, `typecheck`, `lint`, `format:check`, `test` contra un servicio PostgreSQL 15 y `build`.
Un segundo job construye la imagen de producción, lo que valida el `Dockerfile` sin levantar el stack.
