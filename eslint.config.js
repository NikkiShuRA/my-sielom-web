// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "legacy/**",
      "docs/**",
      "_site/**",
      "e2e/.site/**",
      "playwright-report/**",
      "test-results/**",
      "scripts/pages/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["*.ts", "e2e/**/*.ts", "scripts/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  // Бэкенд: без React и DOM, чтобы пакет можно было перенести на сервер без правок
  {
    files: ["packages/api/**/*.ts"],
    languageOptions: { globals: globals.worker },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-router", "@tanstack/*"],
              message: "Пакет api не зависит от интерфейса",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "В пакете api нет DOM" },
        { name: "document", message: "В пакете api нет DOM" },
        { name: "localStorage", message: "Данные хранятся в storage/ через IndexedDB" },
      ],
    },
  },
  // Фронт: только публичный вход пакета api
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@sielom/api/*", "**/packages/api/**"], message: "Импортируйте только @sielom/api" }] },
      ],
    },
  },
);
