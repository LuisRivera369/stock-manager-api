# 05 — Protocolo de trabajo y definición de terminado

> Este es el archivo que más impacta la calidad. Seguirlo evita las tres fallas típicas de un
> agente: implementar de más, abandonar el PRD y declarar éxito sin verificar.

## Ciclo obligatorio

### 1. Leer antes de escribir

- `AGENTS.md` completo.
- Los archivos de `docs/context/` que la tarea toque (mapa en `AGENTS.md` §3).
- El requisito original en `docs/PRD.md` (cita el ID: RF-02, RNF-03…).
- El código existente del área que vas a modificar, antes de proponer cambios.

Si no puedes citar el requisito que justifica el cambio, no lo hagas.

### 2. Plan mínimo (3–6 líneas o lista de pasos)

Declara: archivos que vas a crear/modificar, capas implicadas y cómo vas a verificar. Sin plan no
hay implementación no trivial. Si el plan excede un hito, divide.

### 3. Implementar en orden de capas

`schema → repository → service → controller → route → test → docs`

- Un endpoint, completo de arriba a abajo, antes de empezar el siguiente.
- No dejes TODOs silenciosos: o lo terminas o lo registras como pendiente explícito.
- No refactorices archivos fuera del alcance para "dejarlo bonito".

### 4. Verificar (no negociable)

Ejecuta y **mira la salida real** de los comandos disponibles:

```bash
npm run typecheck     # siempre
npm run test          # siempre que toques lógica o rutas
npm run test:cov      # cuando el hito lo exija
npm run prisma:generate  # tras cambiar schema.prisma (v7 no genera solo)
docker compose up -d  # cuando toques Docker, Prisma, migraciones o env
```

Además, ejercicio funcional del cambio cuando sea observable: petición HTTP real con `curl`
(registro → login guardando cookie → endpoint protegido → logout), o el test que lo cubra.

Un build en verde **no** prueba comportamiento. Un test que no falla cuando rompes el código no
prueba nada: si dudas, rompe el código a propósito y comprueba que el test falla.

### 5. Reportar

Formato de cierre:

```
Hecho: <qué cambió, en una frase>
Archivos: <lista>
Requisitos: <RF-xx / RNF-xx cubiertos>
Verificado: <comandos ejecutados + resultado>
Pendiente / riesgo: <lo que no se cubrió y por qué>
```

Nunca reportes como "verificado" un comando que no ejecutaste. Si algo falla y no lo resuelves,
dilo con el error exacto.

## Definición de terminado (Definition of Done)

Un cambio está terminado solo si **todo** esto es cierto:

- [ ] Cubre el requisito citado y nada más que eso.
- [ ] Respeta las capas y las reglas duras de `AGENTS.md`.
- [ ] Tiene validación Zod de entrada y errores por `errorHandler`.
- [ ] Tiene tests (unit si hay lógica de negocio, integration si hay endpoint).
- [ ] Tiene anotación Swagger si añadió o cambió un endpoint.
- [ ] `.env.example` actualizado si añadió variables.
- [ ] `npm run typecheck` y `npm run test` en verde (con la salida revisada).
- [ ] Sin secretos, `console.log` de depuración ni código comentado muerto.
- [ ] `docs/context/06-decisions.md` actualizado si tomó una decisión de diseño.
- [ ] El reporte incluye qué se verificó y qué quedó fuera.

## Uso de skills

Carga un skill con la herramienta `skill` **cuando la tarea entra en su dominio**, no al inicio de
la sesión:

- Diseño o revisión de API/servicios, migraciones, decisiones de arquitectura → `senior-backend`.
- Consultas Prisma, filtros, relaciones, `$transaction` → `prisma-client-api` (proyecto en Prisma 7, D-16).
- Jest, Supertest, mocking, fixtures, tests de integración → `javascript-testing-patterns`.
- Dockerfile, Compose, healthchecks, multistage, volúmenes → `docker-patterns`.

Los skills son **consejo técnico**, no requisitos. Sobre ellos mandan `AGENTS.md`, `docs/PRD.md` y
este `docs/context/`. Si un skill propone una práctica que contradice el PRD (p. ej. JWT en header
`Authorization`, guardar el token en `localStorage`), ignórala y anota el conflicto.

## Cuándo detenerse y preguntar

Detente y pregunta **antes** de escribir código si:

1. El PRD y `docs/context/` se contradicen.
2. Falta un dato que cambia el diseño: método HTTP, formato de error, si un `OUT` puede dejar stock negativo, cómo se crea el primer `ADMIN`.
3. El cambio exige una dependencia nueva, una carpeta nueva o un campo de modelo nuevo.
4. Hay que tocar código fuera del alcance declarado.
5. No puedes verificar (falta BD, falta script, el comando no existe).

Pregunta concreta > suposición silenciosa. Una pregunta con la propuesta por defecto incluida es
mejor: "El PRD no define X; propongo Y porque Z. ¿Confirmas?".

## Registro de decisiones

- Toda decisión que no sea obvia → una fila en `06-decisions.md` con fecha, contexto y motivo.
- Al cerrar una decisión abierta, cambia su estado a `Aceptada` y actualiza el archivo de contexto afectado.
- Nunca dejes una decisión solo en el chat: el siguiente agente no lo verá.

## Higiene de contexto

- No cargues archivos de contexto que no necesitas: consume ventana y distrae.
- Si un archivo de contexto deja de ser cierto, **corrígelo**; un contexto desactualizado es peor que ninguno.
- Si detectas una regla duplicada en dos archivos, deja una sola copia y referencia la otra.
- Máximo una tarea/hito por cambio: sesiones largas con muchos temas abiertos producen deriva.
