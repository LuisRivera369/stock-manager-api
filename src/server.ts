import { app } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Recibido ${signal}, cerrando servidor...`);

  server.close();
  await prisma.$disconnect();
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
