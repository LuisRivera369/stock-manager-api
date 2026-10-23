import * as movementRepository from "../../src/repositories/movementRepository";
import * as productRepository from "../../src/repositories/productRepository";
import * as movementService from "../../src/services/movementService";

jest.mock("../../src/config/database", () => ({
  runInTransaction: (work: (tx: unknown) => Promise<unknown>) => work({}),
}));
jest.mock("../../src/repositories/productRepository");
jest.mock("../../src/repositories/movementRepository");

const mockedProducts = jest.mocked(productRepository);
const mockedMovements = jest.mocked(movementRepository);

function buildProduct(stock: number) {
  return {
    id: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
    name: "Teclado",
    sku: "TECLADO-1",
    description: null,
    price: 10.0,
    stock,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

const userId = "0b1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d";

describe("movementService.create", () => {
  it("devuelve 404 si el producto no existe o esta eliminado", async () => {
    mockedProducts.findActiveById.mockResolvedValue(null);

    await expect(
      movementService.create(
        {
          productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
          type: "IN",
          quantity: 1,
        },
        userId,
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("rechaza un OUT mayor que el stock sin tocar la BD", async () => {
    mockedProducts.findActiveById.mockResolvedValue(buildProduct(2));

    await expect(
      movementService.create(
        {
          productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
          type: "OUT",
          quantity: 5,
        },
        userId,
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });

    expect(mockedProducts.changeStock).not.toHaveBeenCalled();
    expect(mockedMovements.create).not.toHaveBeenCalled();
  });

  it("suma stock en un IN y registra el movimiento con el usuario de la sesion", async () => {
    mockedProducts.findActiveById.mockResolvedValue(buildProduct(10));
    mockedProducts.changeStock.mockResolvedValue(buildProduct(15));
    mockedMovements.create.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      type: "IN",
      quantity: 5,
      reason: "compra",
      productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
      userId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await movementService.create(
      {
        productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
        type: "IN",
        quantity: 5,
        reason: "compra",
      },
      userId,
    );

    expect(mockedProducts.changeStock).toHaveBeenCalledWith(
      "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
      5,
      expect.anything(),
    );
    expect(mockedMovements.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, quantity: 5, type: "IN" }),
      expect.anything(),
    );
  });

  it("resta stock en un OUT valido", async () => {
    mockedProducts.findActiveById.mockResolvedValue(buildProduct(10));
    mockedProducts.changeStock.mockResolvedValue(buildProduct(7));
    mockedMovements.create.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      type: "OUT",
      quantity: 3,
      reason: null,
      productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
      userId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await movementService.create(
      {
        productId: "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
        type: "OUT",
        quantity: 3,
      },
      userId,
    );

    expect(mockedProducts.changeStock).toHaveBeenCalledWith(
      "6f1b6f1e-8f2a-4a6f-9d5a-2f6a1c3e4b5d",
      -3,
      expect.anything(),
    );
  });
});
