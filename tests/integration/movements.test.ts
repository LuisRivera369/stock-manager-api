import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/config/database";
import { createUserWithCookie } from "../helpers/auth";

const stamp = Date.now();
let counter = 0;

let employee: { id: string; email: string; cookie: string };
let admin: { id: string; email: string; cookie: string };
let productId = "";

async function createProduct(stock = 10): Promise<void> {
  counter += 1;

  const response = await request(app)
    .post("/api/products")
    .set("Cookie", employee.cookie)
    .send({ name: `Movimiento ${counter}`, sku: `MOV-${stamp}-${counter}`, price: 10, stock });

  if (response.status !== 201) {
    throw new Error(`No se pudo crear el producto: ${response.status}`);
  }

  productId = response.body.data.id;
}

async function removeProduct(): Promise<void> {
  await prisma.stockMovement.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
}

beforeAll(async () => {
  employee = await createUserWithCookie("EMPLOYEE");
  admin = await createUserWithCookie("ADMIN");
});

beforeEach(async () => {
  await createProduct(10);
});

afterEach(async () => {
  await removeProduct();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [employee.id, admin.id] } } });
  await prisma.$disconnect();
});

describe("POST /api/stock-movements", () => {
  it("registra un IN, suma stock y vincula al usuario de la sesion", async () => {
    const response = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "IN", quantity: 5, reason: "compra" });

    expect(response.status).toBe(201);
    expect(response.body.data.type).toBe("IN");
    expect(response.body.data.userId).toBe(employee.id);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(15);
  });

  it("registra un OUT y resta stock", async () => {
    const response = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "OUT", quantity: 3 });

    expect(response.status).toBe(201);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(7);
  });

  it("rechaza un OUT mayor que el stock sin dejar rastro", async () => {
    const response = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "OUT", quantity: 50 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(10);

    const movements = await prisma.stockMovement.count({ where: { productId } });
    expect(movements).toBe(0);
  });

  it("rechaza cantidades no positivas con 400", async () => {
    const response = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "IN", quantity: 0 });

    expect(response.status).toBe(400);
  });

  it("devuelve 404 si el producto esta eliminado", async () => {
    await request(app).delete(`/api/products/${productId}`).set("Cookie", admin.cookie);

    const response = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "IN", quantity: 1 });

    expect(response.status).toBe(404);
  });

  it("devuelve 401 sin sesion", async () => {
    const response = await request(app)
      .post("/api/stock-movements")
      .send({ productId, type: "IN", quantity: 1 });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/stock-movements", () => {
  it("un EMPLOYEE no puede ver el historial global (403)", async () => {
    const response = await request(app).get("/api/stock-movements").set("Cookie", employee.cookie);

    expect(response.status).toBe(403);
  });

  it("un ADMIN ve el historial con el movimiento registrado", async () => {
    const created = await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "IN", quantity: 2 });

    const response = await request(app).get("/api/stock-movements").set("Cookie", admin.cookie);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);

    const ids = (response.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(created.body.data.id);
  });

  it("pagina el historial con meta", async () => {
    await request(app)
      .post("/api/stock-movements")
      .set("Cookie", employee.cookie)
      .send({ productId, type: "IN", quantity: 1 });

    const response = await request(app)
      .get("/api/stock-movements?page=1&limit=1")
      .set("Cookie", admin.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 1 });
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(response.body.meta.totalPages).toBeGreaterThanOrEqual(1);
  });
});
