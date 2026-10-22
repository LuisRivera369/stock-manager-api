# 01 — Arquitectura y estructura

> Arquitectura en capas + patrón servicio-repositorio. El objetivo de este archivo es que nunca
> dudes dónde poner código ni qué capa puede llamar a cuál.

## Estructura de referencia

```text
src/
├── @types/            # Extensiones de tipos globales (ej. req.user) y augmentations de Express
├── generated/
│   └── prisma/        # Cliente generado por Prisma 7. No editar, no versionar (D-16)
├── config/
│   ├── database.ts    # PrismaClient + adapter PrismaPg + runInTransaction
│   ├── env.ts         # Validación de process.env con Zod, exporta env tipado
│   └── swagger.ts     # Configuración OpenAPI
├── errors/            # AppError tipado (statusCode + code + details)
├── controllers/       # Traducción HTTP: leer req, llamar service, responder. Sin reglas de negocio.
├── services/          # Reglas de negocio, autorización contextual, transacciones, errores de dominio.
├── repositories/      # Único punto de acceso a Prisma. Consultas y escrituras.
├── routes/            # Declaración de endpoints + middlewares + anotaciones Swagger.
├── middlewares/       # authMiddleware, roleMiddleware, validateSchema, errorHandler
├── schemas/           # Schemas Zod + tipos inferidos
├── app.ts             # Construye y configura Express. Exporta la app. Sin .listen.
└── server.ts          # Punto de entrada: importa app, escucha el puerto, maneja cierre.
tests/
├── setup/             # globalSetup (crea/migra/trunca DATABASE_URL_TEST) y env de tests
├── unit/              # Servicios con repositorios mockeados
└── integration/       # Rutas con Supertest sobre la app
prisma/schema.prisma
```

`app.ts` y `server.ts` están separados a propósito: Supertest importa `app` sin abrir puerto.

## Responsabilidad por capa

| Capa | Sabe | No sabe | Prohibido |
| :--- | :--- | :--- | :--- |
| `routes` | Ruta, método, middlewares y anotaciones OpenAPI | Reglas de negocio | Acceder a Prisma o a `req`/`res` |
| `middlewares` | Validar, autenticar, autorizar, formatear errores | Entidades de dominio más allá de lo mínimo | Consultar la BD (ningún middleware lo hace) |
| `controllers` | Forma HTTP (`req`, `res`, `next`), status codes | Prisma, reglas de negocio | Cálculos de dominio, queries, transacciones |
| `services` | Reglas de negocio, invariantes, transacciones, errores de dominio | `req`/`res` y códigos HTTP concretos | Importar Express, Prisma directo |
| `repositories` | Prisma, filtros de persistencia (ej. `deletedAt: null`) | Reglas de negocio, HTTP | Decidir autorizaciones o lanzar errores HTTP |

Un `service` no importa Express y un `controller` no importa Prisma: esa es la frontera que hace
testeable la lógica sin HTTP y sin base de datos.

## Dirección de dependencias

```text
route → middleware → controller → service → repository → config/database → Prisma
```

- Solo hacia adelante. Un `repository` nunca importa un `service`; un `service` nunca importa un `controller`.
- Un `service` puede depender de **varios** repositorios (ej. `movementService` usa `productRepository` y `movementRepository`).
- Entre services del mismo nivel se permite composición (`movementService` llamado por `productService` es aceptable **solo** si no crea ciclos).
- `schemas/` es dependencia de `routes` y `controllers`; los `services` reciben datos ya validados.
- `config/env.ts` es la única fuente de `process.env`. Nadie más lee `process.env` directamente.

## Flujo de una petición

```text
GET /api/products
  → productRoutes          declara ruta + authMiddleware + (roleMiddleware) + (validateSchema)
  → productController      lee req, llama service, res.status(...).json(...)
  → productService         aplica reglas de negocio
  → productRepository      consulta Prisma con deletedAt: null
  ← controller responde { data: ... }
```

Errores: cualquier capa lanza un error tipado de dominio; `errorHandler` (montado al final en
`app.ts`) lo traduce a la respuesta HTTP de [`02-domain-and-api.md`](02-domain-and-api.md).
Los controllers delegan con `next(error)` (o `catch` con `next`); nunca responden errores ad-hoc.

## Reglas de transacción

- Cambiar stock **y** crear `StockMovement` ocurre dentro de **un** `prisma.$transaction`. Si falla
  una parte, no debe persistir la otra.
- El `StockMovement` usa el `userId` de la sesión (`req.user.id`), nunca uno enviado en el body.
- La transacción vive en el `service`; el `repository` recibe el cliente transaccional (`tx`) como
  parámetro en lugar de abrir su propio `$transaction`.

## Invariantes de arquitectura (revisión rápida)

Antes de cerrar un cambio, verifica:

- [ ] No hay `import { PrismaClient }` fuera de `config/database.ts` y `repositories/`.
- [ ] Nadie importa de `@prisma/client`: el cliente se importa de `src/generated/prisma/client` (D-16).
- [ ] No hay archivos modificados dentro de `src/generated/`.
- [ ] No hay `req`/`res` en `services/`.
- [ ] No hay consultas de Prisma en `controllers/` ni en `routes/`.
- [ ] Cada endpoint nuevo tiene: ruta + schema Zod + controller + service (+ repository si toca BD) + anotación Swagger.
- [ ] Los tipos de entrada vienen de `z.infer`, no están escritos dos veces.
- [ ] `app.ts` no tiene `.listen`; `server.ts` no tiene lógica de negocio.
- [ ] Las transacciones se abren con `runInTransaction`, no con `prisma.$transaction` dentro del service.
- [ ] Ningún archivo nuevo está fuera de esta estructura sin justificación en `06-decisions.md`.

## Sobre `src/@types/`

Aquí van las extensiones de tipos de Express necesarias para `req.user` (payload de sesión) y para
el `error` tipado de los middlewares. Son declaraciones, no implementación: nada de lógica.

## Cambios a esta estructura

No crear carpetas nuevas (`utils/`, `helpers/`, `lib/`, `domain/`) sin aprobación. Si necesitas una,
justifícala en `06-decisions.md` con el problema concreto que resuelve.
