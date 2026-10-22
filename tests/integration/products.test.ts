import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/config/database";
import { createUserWithCookie } from "../helpers/auth";

const stamp = Date.now();
const skuPrefix = `PROD-${stamp}`;

let employee: { id: string; email: string; cookie: string };
let admin: { id: string; email: string; cookie: string };
let productId = "";

beforeAll(async () => {
  employee = await createUserWithCookie("EMPLOYEE");
  admin = await createUserWithCookie("ADMIN");
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({
    where: { userId: { in: [employee.id, admin.id] } },
  });
  await prisma.product.deleteMany({ where: { sku: { startsWith: skuPrefix } } });
  await prisma.user.deleteMany({ where: { id: { in: [employee.id, admin.id] } } });
  await prisma.$disconnect();
});

describe("GET /api/products", () => {
  it("es publico y devuelve un array", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe("POST /api/products", () => {
  it("devuelve 401 sin sesion", async () => {
    const response = await request(app)
      .post("/api/products")
      .send({ name: "Monitor", sku: `${skuPrefix}-X`, price: 10 });

    expect(response.status).toBe(401);
  });

  it("crea el producto, normaliza el SKU y aplica stock por defecto", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Cookie", employee.cookie)
      .send({ name: "Monitor", sku: `${skuPrefix}-monitor`, price: 199.9 });

    expect(response.status).toBe(201);
    expect(response.body.data.sku).toBe(`${skuPrefix}-MONITOR`);
    expect(response.body.data.stock).toBe(0);

    productId = response.body.data.id;
  });

  it("pagina el catalogo y expone price como numero", async () => {
    const response = await request(app).get("/api/products?page=1&limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 1 });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(typeof response.body.data[0].price).toBe("number");
  });

  it("rechaza un limit fuera de rango con 400", async () => {
    const response = await request(app).get("/api/products?limit=500");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza un SKU duplicado con 409", async () => {
    const response = await request(app)
      .post("/api/products")
      .set("Cookie", employee.cookie)
      .send({ name: "Otro", sku: `${skuPrefix}-MONITOR`, price: 10 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });
});

describe("PATCH /api/products/:id", () => {
  it("rechaza editar el stock directamente (D-01)", async () => {
    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Cookie", employee.cookie)
      .send({ stock: 99 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("actualiza campos permitidos", async () => {
    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set("Cookie", employee.cookie)
      .send({ name: "Monitor 4K", price: 249.9 });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Monitor 4K");
    expect(response.body.data.price).toBe(249.9);
  });

  it("devuelve 404 con un id inexistente", async () => {
    const response = await request(app)
      .patch("/api/products/11111111-1111-4111-8111-111111111111")
      .set("Cookie", employee.cookie)
      .send({ name: "Fantasma" });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/products/:id (soft delete)", () => {
  it("un EMPLOYEE no puede eliminar (403)", async () => {
    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Cookie", employee.cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("un ADMIN desactiva el producto sin borrarlo", async () => {
    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Cookie", admin.cookie);

    expect(response.status).toBe(204);

    const stored = await prisma.product.findUnique({ where: { id: productId } });
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).toBeInstanceOf(Date);

    const catalog = await request(app).get("/api/products");
    const ids = (catalog.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).not.toContain(productId);
  });

  it("eliminar dos veces devuelve 404", async () => {
    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Cookie", admin.cookie);

    expect(response.status).toBe(404);
  });
});
