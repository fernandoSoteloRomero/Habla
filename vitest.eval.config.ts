import { defineConfig } from "vitest/config";

// Pruebas de la IA (spec 12): llaman a la API real y cuestan unos centavos.
// No corren con `npm run test`; se corren a mano con `npm run ai:eval` antes de cambiar un prompt.
export default defineConfig({
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    testTimeout: 180_000,
  },
});
