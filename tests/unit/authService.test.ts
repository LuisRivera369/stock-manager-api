import bcrypt from "bcrypt";

import { AppError } from "../../src/errors/AppError";
import { Role } from "../../src/generated/prisma/client";
import * as userRepository from "../../src/repositories/userRepository";
import * as authService from "../../src/services/authService";

jest.mock("../../src/repositories/userRepository");

const mockedRepository = jest.mocked(userRepository);

function buildUser(overrides: Partial<Awaited<ReturnType<typeof userRepository.create>>> = {}) {
  return {
    id: "1f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
    email: "user@example.com",
    password: "$2b$10$hash",
    role: Role.EMPLOYEE,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("authService.register", () => {
  it("rechaza un email ya registrado con 409", async () => {
    mockedRepository.findByEmail.mockResolvedValue(buildUser());

    await expect(
      authService.register({ email: "user@example.com", password: "Password123" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
  });

  it("hashea la contrasena y no la devuelve", async () => {
    mockedRepository.findByEmail.mockResolvedValue(null);
    mockedRepository.create.mockImplementation(async (data) =>
      buildUser({ email: data.email, password: data.password }),
    );

    const result = await authService.register({
      email: "nuevo@example.com",
      password: "Password123",
    });

    const stored = mockedRepository.create.mock.calls[0]?.[0];

    expect(stored?.password).not.toBe("Password123");
    expect(await bcrypt.compare("Password123", stored?.password ?? "")).toBe(true);
    expect("password" in result).toBe(false);
  });
});

describe("authService.login", () => {
  it("devuelve 401 si el usuario no existe", async () => {
    mockedRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: "nadie@example.com", password: "Password123" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
  });

  it("devuelve 401 con el mismo mensaje si la contrasena es incorrecta", async () => {
    const password = await bcrypt.hash("Password123", 10);
    mockedRepository.findByEmail.mockResolvedValue(buildUser({ password }));

    const error = await authService
      .login({ email: "user@example.com", password: "incorrecta" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 401,
      message: "Credenciales invalidas",
    });
  });

  it("firma un token y devuelve el usuario sin password", async () => {
    const password = await bcrypt.hash("Password123", 10);
    mockedRepository.findByEmail.mockResolvedValue(buildUser({ password }));

    const result = await authService.login({
      email: "user@example.com",
      password: "Password123",
    });

    expect(typeof result.token).toBe("string");
    expect(result.user.email).toBe("user@example.com");
    expect("password" in result.user).toBe(false);
  });
});
