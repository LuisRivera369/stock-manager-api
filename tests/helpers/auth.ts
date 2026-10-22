import bcrypt from "bcrypt";
import request from "supertest";

import { app } from "../../src/app";
import { prisma } from "../../src/config/database";
import { Role } from "../../src/generated/prisma/client";

export const DEFAULT_PASSWORD = "Password123";

export async function createUser(
  role: Role,
  password: string = DEFAULT_PASSWORD,
): Promise<{ id: string; email: string }> {
  const email = `test-${role.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2, 8)}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      role,
    },
  });

  return { id: user.id, email: user.email };
}

export async function loginCookie(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<string> {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  const header = response.headers["set-cookie"];
  const raw = Array.isArray(header) ? header[0] : header;

  if (typeof raw !== "string") {
    throw new Error(`Login sin cookie para ${email} (status ${response.status})`);
  }

  return raw.split(";")[0] ?? "";
}

export async function createUserWithCookie(role: Role): Promise<{
  id: string;
  email: string;
  cookie: string;
}> {
  const user = await createUser(role);
  const cookie = await loginCookie(user.email);

  return { ...user, cookie };
}
