import { config } from "dotenv";

// Prioridad: variables del entorno (CI/sistema) > .env.test > .env.
// dotenv no sobreescribe variables ya existentes.
config({ path: ".env.test" });
config();

const testUrl = process.env.DATABASE_URL_TEST;

if (!testUrl) {
  throw new Error(
    "DATABASE_URL_TEST es obligatoria para ejecutar los tests.\n" +
      "Definila en .env.test o pasala en la linea de comandos:\n" +
      "  DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/stock_manager_test npm test",
  );
}

process.env.DATABASE_URL_TEST = testUrl;
// La app y el runner de tests deben apuntar a la misma base aislada.
process.env.DATABASE_URL = testUrl;
