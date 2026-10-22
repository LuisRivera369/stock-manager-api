import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/config/database";
import { DEFAULT_PASSWORD } from "../helpers/auth";

const email = `auth-${Date.now()}@example.com`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("registra un EMPLOYEE y no devuelve la contrasena", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password: DEFAULT_PASSWORD });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe(email);
    expect(response.body.data.role).toBe("EMPLOYEE");
    expect(response.body.data.password).toBeUndefined();
  });

  it("rechaza email duplicado con 409", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password: DEFAULT_PASSWORD });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rechaza un body invalido con 400", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "no-es-email", password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it("ignora campos no permitidos (mass assignment)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: `mass-${Date.now()}@example.com`, password: DEFAULT_PASSWORD, role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  it("emite una cookie HttpOnly", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: DEFAULT_PASSWORD });

    const cookie = response.headers["set-cookie"];
    const raw = Array.isArray(cookie) ? cookie.join(";") : cookie;

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(email);
    expect(raw).toContain("HttpOnly");
    expect(raw).toContain("token=");
  });

  it("devuelve el mismo 401 para usuario inexistente y contrasena incorrecta", async () => {
    const unknown = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@example.com", password: DEFAULT_PASSWORD });

    const wrong = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "incorrecta" });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });
});

describe("POST /api/auth/logout", () => {
  it("elimina la cookie con 204", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: DEFAULT_PASSWORD });

    const cookieHeader = login.headers["set-cookie"];
    const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(";")[0];

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie ?? "");

    expect(response.status).toBe(204);
    expect(String(response.headers["set-cookie"])).toContain("token=;");
  });
});

describe("proteccion de rutas", () => {
  it("devuelve 401 sin cookie", async () => {
    const response = await request(app).post("/api/products").send({});

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("devuelve 401 con una cookie invalida", async () => {
    const response = await request(app).post("/api/products").set("Cookie", "token=token-falso");

    expect(response.status).toBe(401);
  });
});
