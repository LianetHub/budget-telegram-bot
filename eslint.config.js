import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["dist/**", "src/generated/**"],
  },
  {
    files: ["src/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["tests/**/*.ts", "vitest.config.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintConfigPrettier,
);
