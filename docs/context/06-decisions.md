# 06 — Registro de decisiones

> Memoria del proyecto entre sesiones y entre agentes. Si una decisión no está aquí, se volverá a
> discutir (o se implementará de dos formas distintas).
>
> Estados: **Abierta** (no implementar asumiendo respuesta) · **Aceptada** (vigente) ·
> **Rechazada** (no hacer) · **Sustituida** (por otra decisión).

## 1. Decisiones abiertas — requieren confirmación humana

Estas salen de huecos o contradicciones del PRD. **No elijas por tu cuenta**: pregunta, y al
resolverlas cambia el estado a `Aceptada` y actualiza el archivo de contexto afectado.

No quedan decisiones abiertas. Las últimas (D-03, D-13, D-14, D-17) se cerraron el 2026-10-22 y están en la sección 2.

## 2. Decisiones aceptadas

| ID | Fecha | Decisión | Motivo |
| :--- | :--- | :--- | :--- |
| C-01 | 2026-10-22 | Éxito `{ "data": ... }`; error `{ "error": { code, message, details? } }`; catálogo de códigos en `02-domain-and-api.md`. | Un contrato estable permite tests y clientes predecibles; es fácil de sustituir si se acuerda otro. |
| C-02 | 2026-10-22 | Identificadores y archivos en inglés; documentación, comentarios y mensajes de validación en español. | Alinea el código con el stack y la documentación con el equipo. |
| C-03 | 2026-10-22 | Contexto de agentes: `AGENTS.md` como índice corto + `docs/context/` por tema, carga bajo demanda. | Evita un prompt gigante, reduce contradicciones y permite actualizar una regla sin tocar el resto. |
| C-04 | 2026-10-22 | El cambio de stock y la creación del `StockMovement` ocurren en un único `prisma.$transaction`, orquestado por el service. | RF-07 exige trazabilidad total: no puede existir cambio sin movimiento ni movimiento sin cambio. |
| C-05 | 2026-10-22 | `src/config/env.ts` es el único lector de `process.env`, con validación Zod al arranque. | Falla rápido ante configuración inválida y evita secretos dispersos. |
| C-06 | 2026-10-22 | Nueva carpeta `src/errors/` con `AppError` tipado (`statusCode`, `code`, `details`). | Los services lanzan errores de dominio sin importar Express y `errorHandler` los traduce. Se prefiere a `utils/`, que estaba prohibida. |
| C-07 | 2026-10-22 | `runInTransaction` vive en `src/config/database.ts` y es la única puerta a transacciones para los services; los repositorios reciben `tx`. | C-04 exige transacción orquestada por el service sin que este importe `PrismaClient`. Es una excepción acotada y explícita a "solo repositories tocan Prisma". |
| D-02 | 2026-10-22 | `datasource.provider` fijo en `postgresql`; la URL de conexión vive en `prisma.config.ts`. Cambiar de motor exige editar el schema y regenerar. | Prisma no admite `env()` en `provider`. Queda alineado con D-16. |
| D-16 | 2026-10-22 | **Prisma 7** con generador `prisma-client`, `moduleFormat = "cjs"`, salida en `src/generated/prisma` y driver adapter `@prisma/adapter-pg`. | v7 es la major estable (v8 sigue en RC) y `prisma-client-js` está deprecado; la salida CJS evita el coste de ESM en Jest/ts-jest. Detalle abajo. |
| C-08 | 2026-10-22 | Los listados paginados devuelven `{ data: [...], meta: { page, limit, total, totalPages } }`; `page`/`limit` son enteros, default `1`/`20`, máximo `100`. | Un solo contrato de paginación evita que cada listado invente el suyo y permite ampliar sin romper clientes. |
| D-03 | 2026-10-22 | `price Decimal @db.Decimal(10,2)`; la capa HTTP lo expone como **número** (`presentProduct` convierte con `toNumber()`). | Exactitud en la BD sin obligar a los clientes a parsear strings. La API no hace aritmética con el precio, así que la conversión de salida es segura en este rango. |
| D-13 | 2026-10-22 | BD de test dedicada vía `DATABASE_URL_TEST`: `globalSetup` la crea si falta, aplica `prisma migrate deploy` y trunca; `setupFiles` inyecta la URL antes de importar `env.ts`. | Aislamiento total: la suite no toca la BD de desarrollo (verificado: dev conservó su admin, la BD de test quedó vacía). |
| D-14 | 2026-10-22 | Paginación por offset (`page`/`limit`) en catálogo e historial, con `meta`. | El historial crece sin techo; se adopta ahora que el contrato aún no tiene clientes. Sin cursor para no complicar la v1. |
| D-17 | 2026-10-22 | ESLint 10 (flat config) + typescript-eslint + Prettier 3, con `eslint.config.mjs`, `.prettierrc.json` y scripts `lint`, `lint:fix`, `format`, `format:check`. | `npm install` resolvió la major actual (10) en lugar de 9; el flat config es el mismo. El código quedó sin hallazgos y formateado. |
| C-09 | 2026-10-22 | CI en GitHub Actions (`.github/workflows/ci.yml`): job de calidad con PostgreSQL 15 de servicio (typecheck, lint, format:check, test, build) y job de `docker build --target production`. | Los mismos comandos que se ejecutan en local, sin pasos privilegiados. El job de Docker valida el `Dockerfile` sin levantar el stack. |
| C-10 | 2026-10-22 | La aplicación consume una sola `DATABASE_URL`; las credenciales del contenedor (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) son variables de Compose, con defaults, de las que se deriva el `DATABASE_URL` del API. | Prisma y el driver `pg` reciben una URL, no host/usuario sueltos. Separar las variables del contenedor permite cambiarlas sin editar el compose ni exponer secretos en el repo. |

### Decisiones implementadas con la propuesta por defecto (2026-10-22)

Se implementaron tal cual la propuesta de este archivo al construir los Hitos 2 y 3.
**Confirmación humana pendiente:** si alguna debe cambiar, se cambia el código y esta tabla en el mismo commit.

| ID | Decisión implementada | Nota |
| :--- | :--- | :--- |
| D-01 | `stock` no es editable en `PATCH /api/products/:id`; solo cambia vía movimientos. | `updateProductSchema` es `.strict()`: enviar `stock` devuelve 400. |
| D-04 | Edición parcial con `PATCH`. | — |
| D-05 | Solo los endpoints del PRD: catálogo público, CRUD de productos, POST/GET de movimientos. | Sin `GET /products/:id`, sin historial por producto y sin `/auth/me`. |
| D-06 | `OUT` mayor que el stock → `409` sin movimiento ni cambio. | Cubierto por test de integración. |
| D-07 | Seed idempotente del primer `ADMIN` desde `ADMIN_EMAIL`/`ADMIN_PASSWORD`. | `prisma/seed.ts` + `npm run prisma:seed`. |
| D-08 | Login `10`/15 min y register `5`/hora, en limitadores separados. | Verificado con HTTP real: el sexto registro desde la misma IP devuelve 429. |
| D-09 | Cookie `sameSite: "lax"`, `secure` solo en producción. | — |
| D-10 | Contraseña de 8 a 72 caracteres. | — |
| D-11 | SKU normalizado a mayúsculas antes de persistir. | También se rechazan caracteres fuera de `A-Z0-9-`. |
| D-12 | Soft delete repetido → `404`. | — |

### D-16 — Detalle: Prisma 7 con salida CommonJS

**Fecha:** 2026-10-22 · **Estado:** Aceptada · **Sustituye:** el `generator` del bloque del PRD §8

#### Comparación evaluada

| Criterio | Prisma 6 (6.x) | Prisma 7 (elegido) |
| :--- | :--- | :--- |
| Estado del proyecto | Major anterior; generador `prisma-client-js` **deprecado** y con eliminación anunciada | Major estable actual desde finales de 2025; v8 en release candidate |
| Generador | `prisma-client-js` → cliente en `node_modules/@prisma/client` | `prisma-client` → código TypeScript en una ruta propia (`output` obligatorio) |
| Motor | Motor Rust (binarios por plataforma) | Sin motor Rust: menos peso, sin binarios ni `openssl` en la imagen Docker |
| Driver adapter | No requerido | **Obligatorio** (`@prisma/adapter-pg` + `pg`) |
| Configuración CLI | `package.json#prisma` o flags | `prisma.config.ts` en la raíz (schema, datasource, migraciones, seed) |
| Variables de entorno | El CLI carga `.env` solo | **Sin carga automática**: hay que `import "dotenv/config"` en `prisma.config.ts` |
| Semilla | `migrate dev` / `reset` ejecutan el seed | Ya no: solo `prisma db seed` |
| Generación del cliente | Implícita en `migrate dev` | Ya no: hay que ejecutar `prisma generate` explícitamente |
| Jest + ts-jest | Trivial (CommonJS) | Fricción real si el proyecto pasa a ESM (`--experimental-vm-modules`, preset ESM, extensiones `.js`) |
| Alineación con el PRD | Casi literal | Requiere ajustar `generator`, imports y scripts (contenido en `02-domain-and-api.md`) |

#### Decisión

1. **Prisma 7** con `provider = "prisma-client"`, `output = "../src/generated/prisma"`, `runtime = "nodejs"` y **`moduleFormat = "cjs"`**.
2. El proyecto sigue siendo **CommonJS**: `package.json` sin `"type": "module"`, `tsconfig` con `module: "commonjs"`, `target: "ES2022"`. Así Jest/ts-jest y Supertest funcionan sin configuración ESM experimental.
3. El cliente se instancia una sola vez en `src/config/database.ts` con el adapter `PrismaPg`; los `repositories/` importan el cliente desde `src/generated/prisma/client`, nunca desde `@prisma/client`.
4. `DATABASE_URL` se declara en `prisma.config.ts` (con `import "dotenv/config"`) para el CLI, y se valida en `src/config/env.ts` para el runtime. Duplicación intencional: el CLI es un proceso aparte.

#### Por qué no las alternativas

- **Prisma 6:** empezar un proyecto greenfield sobre un generador deprecado, con v8 ya en RC, obliga a migrar dos majors en meses. El único atractivo era el PRD literal, y el ajuste de schema son ~10 líneas.
- **Prisma 7 con ESM completo** (`"type": "module"`): es el camino que muestra la doc, pero en un servidor Node sin bundler obliga a `module: NodeNext` y a escribir `.js` en **todos** los imports relativos, además de configurar ts-jest en modo ESM experimental. Es una fuente constante de deriva para un agente. Si el spike falla, este es el fallback (ver abajo).
- **Prisma 7 con `prisma-client-js`:** sigue existiendo por compatibilidad, pero está deprecado; no tiene sentido elegirlo en código nuevo.

#### Consecuencias

- Scripts: `prisma:migrate` = `prisma migrate dev && prisma generate`; `postinstall` = `prisma generate`.
- `src/generated/` va en `.gitignore`, se excluye de ESLint/coverage y **nunca** se edita a mano.
- Cada `git clone` + `npm install` debe regenerar el cliente (por eso `postinstall`).
- Docker: instalar `openssl` deja de ser necesario para Prisma; la imagen final es más pequeña.
- `target: "ES2022"` en `tsconfig`: el PRD dice "ES2022 / Target ESNext"; se toma ES2022 (nivel de lenguaje, soportado por Node 22) y `module: commonjs`. No es una contradicción con el PRD, es la lectura compatible con CommonJS.
- Los ejemplos de Prisma que el agente encuentre en internet serán de v6 o ESM: la referencia válida es este archivo y `02-domain-and-api.md`.

#### Verificación obligatoria en el Hito 1 (spike previo, ~30 min)

Antes de construir nada más, comprobar en un commit desechable o rama `spike/prisma-cjs`:

1. `prisma.config.ts` se carga correctamente en un paquete **CommonJS** (que el CLI no exija `"type": "module"`).
2. `npx prisma generate` produce `src/generated/prisma/client` y compila con `tsc --noEmit`.
3. `@prisma/adapter-pg` se puede importar desde código CommonJS con `tsx` y con `node dist/...`.
4. Un `create` + `findMany` sobre PostgreSQL real funciona, y un test de Jest lo ejecuta sin flags raros.

Si falla el punto 1, 3 o 4: **fallback** a ESM completo (`"type": "module"`, `module: NodeNext`, extensiones `.js`, ts-jest ESM) y registrar el cambio aquí. El coste del fallback es acotado: solo `package.json`, `tsconfig.json`, `jest.config.js`, `prisma.config.ts`, `src/config/database.ts` y los imports de `repositories/`.

#### Resultado (2026-10-22) — VALIDADO

Ejecutado sobre el proyecto real con Prisma **7.10.1**, TypeScript 5.9, Jest 30 y ts-jest 29.4, contra PostgreSQL 18.1:

1. `prisma.config.ts` se carga en un paquete CommonJS sin `"type": "module"` (`Loaded Prisma config from prisma.config.ts`). **OK**
2. `prisma generate` escribe `src/generated/prisma/client` y `tsc --noEmit` compila sin errores. **OK**
3. `@prisma/adapter-pg` + `PrismaPg` funcionan en `tsx` y en el build compilado (`node dist/src/server.js`). **OK**
4. `create` + `findMany` + `$transaction` reales, ejecutados por Jest sin flags especiales (3 tests en verde). **OK**

No hizo falta el fallback a ESM. Notas observadas:

- `prisma migrate dev` **no** genera el cliente en v7: el script `prisma:migrate` encadena `prisma generate`.
- El CLI avisa de `8.0.0-rc.25` disponible; confirma que v7 es la estable y que la próxima migración mayor ya está en el horizonte.
- `npm audit --omit=dev` = 0 vulnerabilidades. Las 20 moderadas restantes son del toolchain de Jest (js-yaml/istanbul), solo desarrollo y sin severidad alta.

## 3. Cómo registrar una decisión nueva

Añade una fila (o una sección si necesita contexto largo) con este formato:

```md
### D-XX — <título corto>

- **Fecha:** AAAA-MM-DD
- **Estado:** Abierta | Aceptada | Rechazada
- **Contexto:** qué obliga a decidir (cita RF/RNF si aplica).
- **Opciones:** A / B / C con su coste.
- **Decisión:** la elegida y por qué.
- **Consecuencias:** qué se vuelve más fácil y qué más difícil.
- **Archivos afectados:** rutas de `docs/context/` que hay que actualizar.
```

Reglas:

1. Una decisión = una fila/sección. No agrupes temas distintos.
2. Si sustituye a otra, marca la anterior como `Sustituida por D-XX`.
3. Si la decisión cambia una regla de `AGENTS.md` o de otro archivo de contexto, actualízalo en el mismo cambio.
4. Nunca borres decisiones: el histórico explica por qué el código es como es.
