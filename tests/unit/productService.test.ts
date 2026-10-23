import { Role } from "../../src/generated/prisma/client";
import * as productRepository from "../../src/repositories/productRepository";
import * as productService from "../../src/services/productService";

jest.mock("../../src/repositories/productRepository");

const mockedRepository = jest.mocked(productRepository);

function buildProduct(
  overrides: Partial<NonNullable<Awaited<ReturnType<typeof productRepository.findById>>>> = {},
) {
  return {
    id: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
    name: "Teclado",
    sku: "TECLADO-1",
    description: null,
    price: 10.0,
    stock: 5,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

const validInput = {
  name: "Teclado",
  sku: "TECLADO-1",
  price: 10,
  stock: 5,
};

describe("productService.create", () => {
  it("rechaza un SKU duplicado con 409", async () => {
    mockedRepository.findBySku.mockResolvedValue(buildProduct());

    await expect(productService.create(validInput)).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("crea el producto cuando el SKU es unico", async () => {
    mockedRepository.findBySku.mockResolvedValue(null);
    mockedRepository.create.mockResolvedValue(buildProduct());

    await productService.create(validInput);

    expect(mockedRepository.create).toHaveBeenCalledWith({
      name: "Teclado",
      sku: "TECLADO-1",
      description: undefined,
      price: 10,
      stock: 5,
    });
  });
});

describe("productService.update", () => {
  it("devuelve 404 si el producto no existe", async () => {
    mockedRepository.findById.mockResolvedValue(null);

    await expect(
      productService.update("6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d", { name: "Nuevo" }),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("devuelve 404 si el producto fue eliminado logicamente", async () => {
    mockedRepository.findById.mockResolvedValue(
      buildProduct({ deletedAt: new Date("2026-02-01T00:00:00.000Z") }),
    );

    await expect(
      productService.update("6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d", { name: "Nuevo" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rechaza un SKU que ya pertenece a otro producto", async () => {
    mockedRepository.findById.mockResolvedValue(buildProduct({ sku: "VIEJO-1" }));
    mockedRepository.findBySku.mockResolvedValue(buildProduct({ sku: "NUEVO-1" }));

    await expect(
      productService.update("6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d", { sku: "NUEVO-1" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
  });
});

describe("productService.remove", () => {
  it("hace soft delete de un producto activo", async () => {
    mockedRepository.findById.mockResolvedValue(buildProduct());
    mockedRepository.softDelete.mockResolvedValue(buildProduct({ deletedAt: new Date() }));

    await productService.remove("6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d");

    expect(mockedRepository.softDelete).toHaveBeenCalledWith(
      "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
    );
  });

  it("no permite eliminar dos veces", async () => {
    mockedRepository.findById.mockResolvedValue(buildProduct({ deletedAt: new Date() }));

    await expect(
      productService.remove("6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockedRepository.softDelete).not.toHaveBeenCalled();
  });
});

// El fixture usa el enum real para que un cambio de roles rompa el test.
expect(Role.ADMIN).toBe("ADMIN");
