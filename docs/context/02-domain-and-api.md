# 02 — Dominio y contrato de API

> Todo lo de aquí sale del PRD o está marcado explícitamente como convención pendiente de
> confirmación (ver `06-decisions.md`). Lo marcado con ⚠️ **no está cerrado**: no lo implementes
> asumiendo una respuesta, confírmalo primero.

## Modelo de datos (Prisma)

```prisma
generator client {
  provider     = "prisma-client"          // generador de Prisma 7, NO `prisma-client-js`
  output       = "../src/generated/prisma" // obligatorio en v7: ya no se genera en node_modules
  moduleFormat = "cjs"                     // el proyecto compila a CommonJS (D-16)
  runtime      = "nodejs"
}

datasource db {
  provider = "postgresql"                 // fijo: Prisma no admite env() aquí (D-02)
  // url: NO va aquí. Vive en prisma.config.ts (D-16)
}

enum Role { ADMIN, EMPLOYEE }
enum MovementType { IN, OUT }

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String            // siempre hash bcrypt cost 10, nunca texto plano
  role      Role     @default(EMPLOYEE)
  createdAt DateTime @default(now())
  movements StockMovement[]
  @@map("users")
}

model Product {
  id          String   @id @default(uuid())
  name        String
  sku         String   @unique
  description String?
  price       Decimal      @db.Decimal(10, 2) // dinero exacto; la API lo expone como number (D-03)
  stock       Int      @default(0)
  deletedAt   DateTime?        // soft delete: null = activo
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  movements   StockMovement[]
  @@map("products")
}

model StockMovement {
  id        String       @id @default(uuid())
  type      MovementType
  quantity  Int
  reason    String?
  productId String
  userId    String
  createdAt DateTime     @default(now())
  product   Product      @relation(fields: [productId], references: [id])
  user      User         @relation(fields: [userId], references: [id])
  @@map("stock_movements")
}
```

No añadas campos, índices ni relaciones que no estén aquí sin registrarlo en `06-decisions.md`.
`updatedAt` es `@updatedAt`: no se asigna a mano.

### Cliente generado (Prisma 7, ver D-16)

- `prisma generate` escribe TypeScript en `src/generated/prisma/`. Ese árbol **no se edita** y va en `.gitignore`.
- Import correcto: `import { PrismaClient } from "../generated/prisma/client"` (ajusta la profundidad). **Nunca** `from "@prisma/client"`.
- Instancia única en `src/config/database.ts`, con driver adapter obligatorio:

  ```ts
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```

- Solo `repositories/` y `config/database.ts` importan el cliente generado (regla dura 3).
- El CLI lee la URL desde `prisma.config.ts`, no desde el schema; si falta `import "dotenv/config"` ahí, `prisma migrate` no ve `DATABASE_URL`.

## Roles y permisos (RBAC)

| Capacidad | Guest | EMPLOYEE | ADMIN |
| :--- | :---: | :---: | :---: |
| `POST /api/auth/register` | ✅ | ✅ | ✅ |
| `POST /api/auth/login` | ✅ | ✅ | ✅ |
| `POST /api/auth/logout` | ❌ | ✅ | ✅ |
| `GET /api/products` (catálogo) | ✅ | ✅ | ✅ |
| Crear / editar producto | ❌ | ✅ | ✅ |
| Registrar movimiento de stock | ❌ | ✅ | ✅ |
| `DELETE /api/products/:id` (soft delete) | ❌ | ❌ | ✅ |
| Historial global de movimientos | ❌ | ❌ | ✅ |

El rol se lee del JWT validado, nunca de un campo del body o query.
Los endpoints públicos no montan `authMiddleware`.

## Matriz de endpoints

| Método | Ruta | Auth | Body / Params | Respuesta OK |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | — | `{ email, password }` | `201` usuario sin `password` |
| POST | `/api/auth/login` | — | `{ email, password }` | `200` usuario + cookie `token` |
| POST | `/api/auth/logout` | EMPLOYEE+ | — | `204`, cookie eliminada |
| GET | `/api/products` | — | `?page`, `?limit` | `200` página + `meta` |
| GET | `/api/products/:id` | — | — | **No implementado (D-05)** |
| POST | `/api/products` | EMPLOYEE+ | `{ name, sku, description?, price, stock? }` | `201` producto |
| PATCH | `/api/products/:id` | EMPLOYEE+ | campos parciales (sin `stock`) | `200` producto |
| DELETE | `/api/products/:id` | ADMIN | — | `204`, `deletedAt` seteado |
| POST | `/api/stock-movements` | EMPLOYEE+ | `{ productId, type, quantity, reason? }` | `201` movimiento |
| GET | `/api/stock-movements` | ADMIN | `?page`, `?limit` | `200` página + `meta` |
| GET | `/api/products/:id/movements` | EMPLOYEE+ | — | **No implementado (D-05)** |

No añadas endpoints que no estén en esta tabla. Los dos marcados como no implementados existen
solo como posibilidad en el PRD; requieren petición explícita.

## Validación (Zod)

| Campo | Regla |
| :--- | :--- |
| `email` | formato email, se normaliza a minúsculas y se recorta |
| `password` | mínimo 8 caracteres (valor mínimo: ver `06-decisions.md`) |
| `name` | string no vacío, recortado, longitud máxima razonable (100) |
| `sku` | string no vacío, único, recortado, mayúsculas |
| `description` | opcional, string, puede ser `null` |
| `price` | número finito `> 0`, hasta 2 decimales; se persiste `Decimal(10,2)` y se devuelve como `number` |
| `stock` | entero `>= 0` |
| `type` | enum: `IN` o `OUT` |
| `quantity` | entero `> 0` |
| `reason` | opcional, string |

El schema vive en `src/schemas/` y exporta el tipo con `z.infer`. `validateSchema` valida y
**reemplaza** `req.body`/`req.params`/`req.query` por el valor parseado.

## Formato de respuesta (convención del proyecto ⚠️)

Éxito: el recurso bajo `data`. Los listados paginados añaden `meta` (C-08).

```json
{ "data": { "id": "...", "name": "..." } }
```

```json
{ "data": [], "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

Error: envoltura estable, sin stack traces en producción.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [] } }
```

Códigos de error permitidos: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

| Situación | Status | `code` |
| :--- | :---: | :--- |
| Body/params inválidos (Zod) | 400 | `VALIDATION_ERROR` |
| Sin cookie, token inválido o expirado | 401 | `UNAUTHORIZED` |
| Autenticado sin permiso de rol | 403 | `FORBIDDEN` |
| Recurso inexistente o con `deletedAt` | 404 | `NOT_FOUND` |
| Email o SKU duplicado | 409 | `CONFLICT` |
| Rate limit excedido | 429 | `RATE_LIMITED` |
| Fallo no controlado | 500 | `INTERNAL_ERROR` |

Nunca devuelvas el mensaje de Prisma ni rutas internas al cliente; `errorHandler` los mapea.

## Reglas de negocio

1. **Registro**: hash con bcrypt cost 10, rol `EMPLOYEE` forzado (ignora cualquier `role` enviado).
2. **Login**: email inexistente y contraseña incorrecta devuelven el **mismo** 401 (no revelar cuál falló).
3. **Catálogo**: toda lectura filtra `deletedAt: null`, incluido `GET /api/products/:id`.
4. **Soft delete**: solo `ADMIN`; setea `deletedAt = now()`. Idempotente: repetir devuelve `404` o `204`, según se acuerde en `06-decisions.md`.
5. **Movimientos**: `IN` suma stock, `OUT` resta; ambos en transacción con la creación del `StockMovement` y con `userId` de la sesión.
6. **Stock negativo** ⚠️: el PRD no define si un `OUT` mayor al stock se rechaza. Propuesta pendiente: rechazar con `409 CONFLICT`. No lo implementes sin confirmar.
7. **Edición de producto**: si se permite enviar `stock` en el update, debe generar movimiento (RF-07). Ver contradicción abierta en `06-decisions.md`.
8. **Producto eliminado**: no aparece en catálogo, no acepta movimientos nuevos (`404`), pero sus movimientos históricos se conservan.

## Documentación (Swagger)

- Todos los endpoints documentados en `/api-docs` vía anotaciones `swagger-jsdoc` en `src/routes/`.
- Cada endpoint documenta: resumen, auth requerida, body/params, 2xx y los errores posibles de la tabla anterior.
- Un endpoint sin anotación no se considera terminado.
