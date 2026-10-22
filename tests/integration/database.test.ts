import { prisma } from "../../src/config/database";
import { MovementType, Role } from "../../src/generated/prisma/client";

const stamp = Date.now();
const sku = `TEST-${stamp}`;
const email = `test-${stamp}@example.com`;

let userId = "";
let productId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email, password: "hash-de-prueba", role: Role.EMPLOYEE },
  });

  userId = user.id;
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { sku } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("Prisma 7 con moduleFormat cjs", () => {
  it("crea y lee un producto con el cliente generado", async () => {
    const created = await prisma.product.create({
      data: { name: "Teclado", sku, price: 49.9, stock: 10 },
    });

    productId = created.id;

    const found = await prisma.product.findMany({
      where: { sku, deletedAt: null },
    });

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(created.id);
    expect(found[0]?.price.toNumber()).toBe(49.9);
  });

  it("cambia el stock y registra el movimiento en una transaccion", async () => {
    if (!productId) {
      throw new Error("El producto del primer test no se creo");
    }

    const movement = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: 3 } },
      });

      return tx.stockMovement.create({
        data: {
          type: MovementType.OUT,
          quantity: 3,
          reason: "prueba de integracion",
          productId: updated.id,
          userId,
        },
      });
    });

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });

    expect(product.stock).toBe(7);
    expect(movement.userId).toBe(userId);
  });
});
