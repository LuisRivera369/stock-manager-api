# 📄 Product Requirements Document (PRD)
## Stock Manager API — Sistema Modular de Gestión de Inventario y Auditoría

*   **Versión:** 1.1.0
*   **Estado:** En Planificación / Especificación Completa
*   **Lenguaje:** TypeScript (Node.js)
*   **Autor/Arquitecto:** Desarrollador Backend

---

## 1. Resumen Ejecutivo (Executive Summary)
**Stock Manager API** es una solución backend RESTful tipada y modular desarrollada en **TypeScript** y **Node.js** para la administración eficiente y segura de inventarios corporativos. El sistema resuelve el problema clásico del control de stock desorganizado mediante una arquitectura limpia, trazabilidad estricta de movimientos (auditoría por usuario) y prácticas de seguridad defensiva de nivel de producción (JWT en cookies `HttpOnly`). Está completamente contenedorizado mediante **Docker** y **Docker Compose** para garantizar un entorno de ejecución reproducible.

---

## 2. Objetivos del Proyecto (Goals & Objectives)
*   Construir una API altamente tipada bajo la **Arquitectura en Capas** y el **Patrón Servicio-Repositorio**.
*   Garantizar **tipado estricto de extremo a extremo** integrando TypeScript con Zod y Prisma ORM.
*   Ofrecer una **persistencia desacoplada del motor** mediante Prisma ORM sobre PostgreSQL, con el acceso a datos aislado en la capa de repositorios (ver D-02 y D-18).
*   Facilitar el despliegue inmediato con un solo comando mediante **Docker Compose** (servicios de API + PostgreSQL).
*   Implementar **seguridad defensiva** basada en JWT en cookies `HttpOnly`, cifrado de contraseñas, *Helmet* y *Rate Limiting*.
*   Asegurar la calidad del código mediante **pruebas unitarias e de integración** automatizadas con Jest/TS-Jest y Supertest.
*   Proveer documentación interactiva OpenAPI mediante **Swagger UI** (`/api-docs`).

---

## 3. Stack Tecnológico

*   **Lenguaje:** TypeScript (ES2022 / Target ESNext)
*   **Runtime & Server:** Node.js (LTS), Express.js
*   **Ejecución Dev:** `tsx` (TypeScript Execute con Hot-Reload)
*   **ORM:** Prisma ORM (`@prisma/client`)
*   **Infraestructura & Contenedores:** Docker, Docker Compose, PostgreSQL 15
*   **Seguridad:** `bcrypt`, `jsonwebtoken`, `cookie-parser`, `helmet`, `express-rate-limit`, `cors`
*   **Validación de Datos:** Zod (con inferencia automática de tipos para TypeScript)
*   **Testing:** Jest, `ts-jest`, Supertest
*   **Documentación:** `swagger-ui-express`, `swagger-jsdoc`

---

## 4. Arquitectura y Estructura del Proyecto

El código sigue estrictamente la separación horizontal de responsabilidades con TypeScript:

```text
stock-manager-api/
├── .github/
├── prisma/
│   └── schema.prisma           # Esquema de modelos y enums de Prisma
├── src/
│   ├── @types/                 # Extensiones de tipos globales de TypeScript (Express)
│   ├── config/
│   │   ├── database.ts         # Instancia global de Prisma Client
│   │   ├── env.ts              # Validación de variables de entorno con Zod
│   │   └── swagger.ts          # Configuración de OpenAPI
│   ├── controllers/
│   │   ├── authController.ts   # Controladores HTTP de autenticación
│   │   ├── productController.ts# Controladores HTTP de productos
│   │   └── movementController.ts# Controladores HTTP de movimientos/auditoría
│   ├── services/
│   │   ├── authService.ts      # Lógica de negocio de usuarios/tokens
│   │   ├── productService.ts   # Lógica de negocio de productos
│   │   └── movementService.ts  # Lógica de auditoría e historial
│   ├── repositories/
│   │   ├── userRepository.ts   # Operaciones en BD de usuarios
│   │   ├── productRepository.ts# Operaciones en BD de productos
│   │   └── movementRepository.ts# Operaciones en BD de movimientos
│   ├── routes/
│   │   ├── authRoutes.ts       # Endpoints /api/auth
│   │   ├── productRoutes.ts    # Endpoints /api/products
│   │   └── movementRoutes.ts   # Endpoints /api/stock-movements
│   ├── middlewares/
│   │   ├── authMiddleware.ts   # Extracción y validación de JWT desde Cookie
│   │   ├── roleMiddleware.ts   # Control de acceso basado en roles (RBAC)
│   │   ├── validateSchema.ts   # Middleware genérico de validación Zod
│   │   └── errorHandler.ts     # Manejo centralizado de errores
│   ├── schemas/
│   │   ├── authSchema.ts       # Esquemas de validación Zod para Auth
│   │   └── productSchema.ts    # Esquemas de validación Zod para Productos
│   ├── app.ts                  # Configuración de Express (sin .listen)
│   └── server.ts               # Punto de entrada para el servidor HTTP
├── tests/
│   ├── unit/                   # Pruebas de Servicios con Mocks en TS
│   └── integration/            # Pruebas E2E de Rutas con Supertest
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── jest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Roles y Control de Accesos (RBAC)

| Rol | Alcance | Permisos Principales |
| :--- | :--- | :--- |
| **Guest (Invitado)** | Público / Sin Token | Registro (`/api/auth/register`), Login (`/api/auth/login`), Consultar catálogo general (`GET /api/products`). |
| **Employee (Empleado)** | Autenticado | Todo lo de Guest + Crear productos, actualizar datos/stock, registrar movimientos de entrada/salida, Logout. |
| **Admin (Administrador)** | Autenticado Elevado | Todo lo de Employee + **Eliminación Lógica (`Soft Delete`)** de productos y consulta completa del historial de auditoría global. |

---

## 6. Requerimientos Funcionales (Functional Requirements)

### Módulo de Autenticación (`/api/auth`)
*   **RF-01 (Registro):** Permite registrar usuarios cifrando la contraseña con `bcrypt` (cost Factor: 10). Asigna el rol `EMPLOYEE` por defecto.
*   **RF-02 (Login):** Valida credenciales y emite un JWT firmado que se adjudica en una **Cookie `HttpOnly` y `Secure`**.
*   **RF-03 (Logout):** Invalida y elimina la cookie de sesión del cliente HTTP.

### Módulo de Productos e Inventario (`/api/products`)
*   **RF-04 (Consulta de Catálogo):** Retorna únicamente los productos cuyo campo `deletedAt` sea nulo (`null`).
*   **RF-05 (Creación y Edición):** Valida estrictamente las propiedades con Zod (`name`, `sku` único, `price > 0`, `stock >= 0`).
*   **RF-06 (Soft Delete):** Inactiva el registro estableciendo la fecha/hora en `deletedAt` mediante la acción de un usuario con rol `ADMIN`.

### Módulo de Auditoría y Movimientos (`/api/stock-movements`)
*   **RF-07 (Trazabilidad Transaccional):** Toda modificación manual o automática del stock debe crear una entrada en `StockMovement`, vinculando el ID del producto, el tipo (`IN` / `OUT`), la cantidad, la razón y el ID del usuario autor de la acción.

---

## 7. Requerimientos No Funcionales (Non-Functional Requirements)

*   **RNF-01 (Tipado Estricto):** El proyecto debe compilar sin errores bajo el flag `"strict": true` en `tsconfig.json`.
*   **RNF-02 (Contenedorización):** La aplicación debe ejecutarse de forma idéntica en entornos locales y productivos utilizando la imagen definida en `Dockerfile` y `docker-compose.yml`.
*   **RNF-03 (Seguridad Defensiva):**
    *   Uso obligatorio de `helmet` para ocultar firmas de servidor e inyectar cabeceras de seguridad.
    *   *Rate Limit* de 100 peticiones por ventana de 15 minutos (y restricciones más estrictas en `/api/auth/login`).
    *   Protección contra robos XSS aislando el token dentro de una Cookie `HttpOnly`.
*   **RNF-04 (Documentación):** Acceso a la interfaz gráfica interactiva de Swagger UI mediante la ruta `/api-docs`.

---

## 8. Esquema de Base de Datos (Prisma Schema en TypeScript)

```prisma
// prisma/schema.prisma

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
  runtime      = "nodejs"
}

datasource db {
  provider = "postgresql" // Unico motor soportado (ver docs/context/06-decisions.md, D-02 y D-18)
}

enum Role {
  ADMIN
  EMPLOYEE
}

enum MovementType {
  IN
  OUT
}

model User {
  id        String          @id @default(uuid())
  email     String          @unique
  password  String
  role      Role            @default(EMPLOYEE)
  createdAt DateTime        @default(now())
  movements StockMovement[]

  @@map("users")
}

model Product {
  id          String          @id @default(uuid())
  name        String
  sku         String          @unique
  description String?
  price       Decimal         @db.Decimal(10, 2)
  stock       Int             @default(0)
  deletedAt   DateTime?       // Soft Delete Flag
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
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

---

## 9. Plan de Implementación por Entregables (Roadmap)

1.  **Hito 1: Entorno, TypeScript y Dockerization**
    *   Inicializar proyecto TypeScript (`tsconfig.json`, `package.json`).
    *   Crear `Dockerfile` y `docker-compose.yml` conectados a PostgreSQL.
    *   Configurar Prisma ORM y ejecutar las primeras migraciones.
2.  **Hito 2: Arquitectura Base y Autenticación**
    *   Configurar `app.ts` y `server.ts` con Express y middlewares globales (Helmet, Cookie Parser, CORS).
    *   Implementar `userRepository`, `authService`, `authController` y esquemas Zod.
    *   Configurar firma/verificación de JWT con cookies `HttpOnly`.
3.  **Hito 3: Productos, Auditoría y Soft Delete**
    *   Implementar el CRUD de productos con exclusión automática de elementos con `deletedAt`.
    *   Implementar transacciones con Prisma para registrar movimientos de stock (`StockMovement`) vinculando la sesión del usuario.
4.  **Hito 4: Testing, Swagger y Publicación**
    *   Documentar endpoints con anotaciones OpenAPI (Swagger JSDoc).
    *   Desarrollar pruebas unitarias con Jest para la capa de servicios y pruebas E2E con Supertest.
    *   Redactar el `README.md` final con instrucciones claras para ejecutar con Docker.
