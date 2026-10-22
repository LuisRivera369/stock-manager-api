# AGENTS.md — Punto de entrada para agentes de IA

Este archivo se lee **siempre y completo** antes de escribir código. Es un **índice**, no la
especificación entera: cada tema vive en `docs/context/` y se carga solo cuando la tarea lo toca.

La fuente de verdad de requisitos es `docs/PRD.md`. Si algo no está en el PRD ni en
`docs/context/`, **no lo inventes**: anótalo en `docs/context/06-decisions.md` y pregunta.

---

## 1. Proyecto

**Stock Manager API** — backend REST modular de inventario y auditoría con trazabilidad por usuario.

Stack fijado (no se cambia sin aprobación explícita):

- Node.js LTS + Express.js
- TypeScript `strict: true` (target ES2022, **CommonJS**), ejecución dev con `tsx`
- Prisma ORM **7** (generador `prisma-client`, `moduleFormat = "cjs"`, driver adapter `@prisma/adapter-pg`) + PostgreSQL 15
- Zod para validación y tipos
- Jest + ts-jest + Supertest
- Docker + Docker Compose
- Seguridad: `bcrypt`, `jsonwebtoken`, `cookie-parser`, `helmet`, `express-rate-limit`, `cors`

**Estado:** Hitos 1-4 implementados y verificados en local (auth con JWT en cookie, productos con
soft delete, movimientos transaccionales, Swagger, README, 46 tests en verde). Pendiente: verificar
`docker compose up` real (el daemon de Docker estaba apagado).

---

## 2. Reglas duras (no negociables)

1. `strict: true`. Prohibido `any` explícito, `@ts-ignore`, `@ts-expect-error` y `as` para silenciar errores de tipos.
2. Respetar las capas, sin excepciones: `route → middleware → controller → service → repository → Prisma`.
3. Solo la capa `repositories/` consulta la base de datos; `config/database.ts` únicamente instancia el `PrismaClient`. Un controller nunca consulta la base de datos ni contiene lógica de negocio.
4. Toda entrada HTTP (body, params, query) se valida con Zod en `src/schemas/`. Los tipos se **infieren** del schema (`z.infer`), no se duplican a mano.
5. El JWT viaja **solo** en cookie `HttpOnly` (`Secure` en producción). Nunca en body, header `Authorization`, `localStorage` ni logs.
6. Contraseñas siempre con `bcrypt` cost 10. Nunca loggear contraseñas, tokens, secretos ni el contenido de `.env`.
7. **Todo** cambio de stock pasa por `movementService` y crea un `StockMovement` con el `userId` del autor (RF-07). Sin excepciones.
8. Soft delete solo vía `deletedAt`. Ninguna consulta de catálogo devuelve registros con `deletedAt != null`.
9. No añadir dependencias, endpoints, campos de modelo, carpetas ni features que el PRD no pida.
10. No declarar una tarea terminada sin ejecutar la verificación de `docs/context/05-workflow.md`.

---

## 3. Mapa de contexto — carga bajo demanda

| Archivo | Léelo cuando… |
| :--- | :--- |
| [`docs/context/00-project.md`](docs/context/00-project.md) | Empiezas una sesión o necesitas saber alcance, hitos y qué **no** se construye. |
| [`docs/context/01-architecture.md`](docs/context/01-architecture.md) | Creas archivos, decides dónde va una responsabilidad o dudas entre capas. |
| [`docs/context/02-domain-and-api.md`](docs/context/02-domain-and-api.md) | Tocas Prisma, endpoints, roles/RBAC, códigos HTTP o el formato de respuesta. |
| [`docs/context/03-security.md`](docs/context/03-security.md) | Tocas auth, cookies, CORS, rate limiting, helmet, variables de entorno o logs. |
| [`docs/context/04-conventions.md`](docs/context/04-conventions.md) | Nombras archivos/símbolos, escribes tests, commits, imports o config de TS. |
| [`docs/context/05-workflow.md`](docs/context/05-workflow.md) | **Siempre** antes de implementar y antes de decir "terminado". |
| [`docs/context/06-decisions.md`](docs/context/06-decisions.md) | Encuentras una ambigüedad o contradicción, o vas a tomar una decisión de diseño. |
| `docs/PRD.md` | Necesitas el requisito original exacto (IDs RF-01…RF-07, RNF-01…RNF-04). |

Regla de lectura: **no cargues todo `docs/context/` por reflejo**. Si la tarea es un endpoint de
productos, necesitas 00, 01, 02, 04 y 05; 03 solo si tocas seguridad.

---

## 4. Skills disponibles

Los skills están instalados en `.agents/skills/` y se cargan con la herramienta `skill` **por nombre**,
solo cuando aportan. No los cargues todos al inicio: máximo 4 instalados y uno por tarea. Cada skill
extra consume contexto y añade superficie de conflicto con estas reglas.

| Nombre | Úsalo para | Cuándo **no** usarlo |
| :--- | :--- | :--- |
| `senior-backend` | Diseño de API, decisiones de arquitectura backend, revisión de código, migraciones, load testing. | Tareas triviales de un solo archivo. **No** ejecutes su `api_scaffolder.py` sobre el repo: genera su propia estructura y pisa las capas definidas en `01-architecture.md`. |
| `prisma-client-api` | Consultas Prisma, filtros, relaciones, `$transaction` y ciclo de vida del cliente — la capa `repositories/`. | Nunca para patrones de Prisma 6 (`@prisma/client` en `node_modules`, cliente sin adapter): el proyecto fija Prisma 7 (D-16). |
| `javascript-testing-patterns` | Jest + Supertest, mocking, fixtures, tests de integración con limpieza de datos. | Tests triviales o cuando ya existe un patrón acordado en `04-conventions.md`. |
| `docker-patterns` | `Dockerfile`, `docker-compose.yml`, volúmenes, redes, healthchecks, multistage. | Código de aplicación. |

Un skill **no anula** este archivo ni el PRD. Si un skill propone algo que contradice las reglas
duras, ganan las reglas duras; anota el conflicto en `06-decisions.md`.

---

## 5. Comandos del proyecto

Nombres de script canónicos (no inventes otros):

```bash
npm run dev         # tsx watch src/server.ts
npm run build       # tsc -> dist/
npm run start       # node dist/src/server.js
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run format      # prettier --write .
npm run format:check
npm run test        # jest (unit + integracion, BD DATABASE_URL_TEST)
npm run test:cov    # jest --coverage
npm run prisma:generate   # prisma generate (también en postinstall; v7 no genera solo)
npm run prisma:migrate    # prisma migrate dev && prisma generate
npm run prisma:seed       # prisma db seed (primer ADMIN desde env)
```

CI (`.github/workflows/ci.yml`) ejecuta `npm ci`, `typecheck`, `lint`, `format:check`, `test` y
`build` sobre PostgreSQL 15, más `docker build --target production`. Si algo pasa en local pero
falla en CI, la diferencia suele ser una variable de entorno o un archivo que no está en el repo.

---

## 6. Si algo no cuadra

1. Contradicción entre PRD y contexto → **detente**, no elijas por tu cuenta.
2. Requisito ambiguo (método HTTP, paginación, formato de error) → revisa `06-decisions.md`; si sigue abierto, pregunta.
3. Necesitas una dependencia nueva → justifícala y espera aprobación.
4. Cambiaste una decisión de diseño → actualiza `06-decisions.md` en el mismo cambio.

Al reportar, di qué hiciste, qué verificaste con qué comando y qué quedó pendiente.
