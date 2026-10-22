# 04 — Convenciones de código

> Consistencia por encima de preferencia personal. Si una regla de aquí choca con el código
> existente, sigue el código existente y anota la discrepancia; no reformatees archivos ajenos al
> cambio.

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`.
- **CommonJS**: `module: "commonjs"`, `moduleResolution: "node"`, `target: "ES2022"`, y `package.json` sin `"type": "module"`. Es consecuencia de D-16 (Prisma 7 con `moduleFormat = "cjs"`) y mantiene Jest/ts-jest simple. No mezclar con ESM: nada de `import.meta` ni de extensiones `.js` en imports relativos.
- `src/generated/**` está excluido de ESLint, Prettier y cobertura; es código de Prisma, no del proyecto.
- Sin `any` explícito. Si el tipo es desconocido: `unknown` + narrowing.
- Sin `@ts-ignore` / `@ts-expect-error`. Sin `as` para forzar tipos; usa type guards o Zod.
- `interface` para formas de objetos de dominio y contratos; `type` para unions, intersecciones y alias.
- Enums del dominio: usa los que genera Prisma (`Role`, `MovementType`), no dupliques strings.
- Funciones exportadas con tipo de retorno explícito.

## Nombres

| Elemento | Convención | Ejemplo |
| :--- | :--- | :--- |
| Archivos | camelCase + sufijo de capa | `productService.ts`, `authMiddleware.ts` |
| Carpetas | plural, minúsculas | `controllers/`, `repositories/` |
| Variables y funciones | camelCase, verbo en inglés | `getActiveProducts`, `createMovement` |
| Clases / tipos / interfaces | PascalCase | `Product`, `CreateProductInput` |
| Constantes de configuración | UPPER_SNAKE_CASE | `DEFAULT_BCRYPT_ROUNDS` |
| Schemas Zod | sufijo `Schema` | `createProductSchema` |
| Tipos inferidos | sufijo `Input` / `Dto` | `CreateProductInput` |
| Tablas Prisma | snake_case vía `@@map` | `stock_movements` |
| Middlewares | sufijo `Middleware` | `roleMiddleware` |

Idioma: **identificadores y nombres de archivo en inglés**; comentarios, mensajes de error de
usuario y documentación en **español**.

## Estilo y estructura de archivo

- 2 espacios, punto y coma, comillas dobles, ancho 100. Lo aplican Prettier (`.prettierrc.json`) y ESLint (`eslint.config.mjs`): `npm run format` y `npm run lint` deben pasar.
- Orden de imports: (1) Node built-ins, (2) dependencias externas, (3) alias/rutas internas, (4) tipos. Línea en blanco entre grupos.
- Un archivo = una responsabilidad. Si supera ~200 líneas, probablemente está mezclando capas.
- Funciones cortas y con nombre descriptivo; evita comentarios que repiten el código. Comenta el **por qué**, no el qué.
- Sin `console.log` en código de producción; logs solo en `server.ts`/arranque o el logger acordado.
- Manejo de errores: lanza errores de dominio tipados, nunca strings.

## Schemas y tipos

- El schema Zod es la fuente única: `export type X = z.infer<typeof xSchema>`.
- `z.object({...}).strict()` para rechazar campos inesperados (mass assignment).
- Los mensajes de validación son en español y no exponen detalles internos.
- No crear interfaces paralelas al schema.

## Tests

- Ubicación: `tests/unit/**` y `tests/integration/**`; nombre `*.test.ts`.
- Configuración en `jest.config.js` (CommonJS, preset `ts-jest`), no en `jest.config.ts`: evita añadir `ts-node`. `maxWorkers: 1` porque los tests de integración comparten una BD real.
- La suite usa `DATABASE_URL_TEST`, no la BD de desarrollo: `globalSetup` crea/migra/trunca la BD y `setupFiles` inyecta la URL antes de importar `env.ts` (D-13).
- Un archivo de test por unidad bajo prueba, con el mismo nombre base (`productService.test.ts`).
- **Unit**: mockean repositorios; nunca Prisma real ni red. Probar reglas de negocio e invariantes.
- **Integration**: Supertest contra `app` importada; BD de test dedicada o mocks de Prisma según se acuerde. Probar status, `code` de error y forma de la respuesta.
- Casos mínimos por flujo: camino feliz, validación inválida, no autenticado, sin permiso, recurso inexistente.
- Prohibido: tests que dependan del orden de ejecución, `setTimeout` arbitrarios o asserts triviales.
- Un bug corregido se acompaña del test que lo reproduce.

## Commits y ramas

- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `build:`.
- Mensaje en español, imperativo, primera línea ≤ 72 caracteres, describe el **por qué**.
- Rama por hito o unidad de trabajo: `feat/hito-2-auth`, `fix/stock-negativo`.
- Un commit = cambio coherente y verificable. No mezclar refactor masivo con feature.
- No commitear `.env`, `node_modules`, `dist`, dumps ni artefactos de build.

## Dependencias

- Antes de añadir una librería: ¿ya está en el stack del PRD? ¿resuelve algo real ahora?
- Requiere justificación y aprobación (ver `AGENTS.md` §6). Fijar versión y actualizar el lockfile.
- No añadir librerías que dupliquen lo que Zod, Prisma o Express ya hacen.

## Documentación

- Cada endpoint: anotación OpenAPI + ejemplo de request/response.
- Nuevo comportamiento no obvio: una línea en el README o en el archivo de contexto correspondiente.
- Cambio que afecta a otros agentes/desarrolladores: actualiza `docs/context/` en el mismo cambio.
