import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore project scripts and temporary files (legacy tooling)
    "scripts/**",
    "tmp/**",
    "*.mjs",
  ]),
  // Project-level rule adjustments to reduce noise from legacy files and
  // ease migration: make explicit `any` warnings instead of errors and
  // allow commonjs requires in non-source scripts.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
