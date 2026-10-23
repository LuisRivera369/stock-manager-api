import bcrypt from "bcrypt";

import { prisma } from "../src/config/database";
import { env } from "../src/config/env";
import { Role } from "../src/generated/prisma/client";

async function main(): Promise<void> {
  // Siempre creamos productos y movimientos de prueba (usamos upsert para idempotencia)
  const testProducts = [
    { name: "Teclado", sku: "TECLADO-001", price: 49.9, stock: 10 },
    { name: "Mouse", sku: "MOUSE-001", price: 29.9, stock: 50 },
    { name: "Monitor", sku: "MONITOR-001", price: 129.99, stock: 5 },
    { name: "Teclado Gaming", sku: "TECLADO-GAME", price: 149.99, stock: 2 },
  ];

  // Crear/actualizar productos de prueba (upsert por SKU)
  const createdProducts: { id: string; name: string; sku: string; price: number; stock: number }[] = [];
  for (const productData of testProducts) {
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {
        name: productData.name,
        price: productData.price,
        stock: productData.stock,
      },
      create: {
        name: productData.name,
        sku: productData.sku,
        price: productData.price,
        stock: productData.stock,
      },
    });
    createdProducts.push(product as { id: string; name: string; sku: string; price: number; stock: number });
  }

  console.log(`${createdProducts.length} productos configurados`);

  // Si vienen credenciales de admin, crear usuario admin también
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const password = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

    const admin = await prisma.user.upsert({
      where: { email: env.ADMIN_EMAIL },
      update: { role: Role.ADMIN },
      create: {
        email: env.ADMIN_EMAIL,
        password,
        role: Role.ADMIN,
      },
    });

    // Crear algunos movimientos de stock de prueba
    const adminId = admin.id;
    const testMovements = [
      { type: "IN" as const, quantity: 5, reason: "stock inicial", productId: createdProducts[0].id, userId: adminId },
      { type: "OUT" as const, quantity: 2, reason: "venta", productId: createdProducts[1].id, userId: adminId },
      { type: "IN" as const, quantity: 3, reason: "reabastecimiento", productId: createdProducts[2].id, userId: adminId },
    ];

    for (const movement of testMovements) {
      await prisma.stockMovement.create({
        data: {
          type: movement.type,
          quantity: movement.quantity,
          reason: movement.reason,
          productId: movement.productId,
          userId: movement.userId,
        },
      });
    }

    console.log(`Admin asegurado: ${admin.email}`);
    console.log(`3 movimientos de stock configurados`);
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD no definidos: solo productos de prueba configurados");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });