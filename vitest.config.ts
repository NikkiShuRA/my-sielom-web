import { defineConfig } from "vitest/config";

// Каждый пакет описывает свои тесты сам, здесь только список пакетов
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
  },
});
