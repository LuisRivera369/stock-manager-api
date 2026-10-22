import bcrypt from "bcrypt";

import { prisma } from "../src/config/database";
import { env } from "../src/config/env";
import { Role } from "../src/generated/prisma/client";

async function main(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD no definidos: seed omitido");
    return;
  }

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

  console.log(`Admin asegurado: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
