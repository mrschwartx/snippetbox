import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const namingConvention = [
  "error",
  {
    selector: "default",
    format: ["camelCase"],
    leadingUnderscore: "allow",
  },
  {
    selector: "variable",
    format: ["camelCase", "UPPER_CASE", "PascalCase"],
    leadingUnderscore: "allow",
  },
  {
    selector: "function",
    format: ["camelCase", "PascalCase"],
  },
  {
    selector: "typeLike",
    format: ["PascalCase"],
  },
  {
    selector: "enumMember",
    format: ["UPPER_CASE", "PascalCase"],
  },
  {
    selector: [
      "objectLiteralProperty",
      "typeProperty",
      "objectLiteralMethod",
      "classProperty",
    ],
    format: null,
  },
  {
    selector: "import",
    format: null,
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/naming-convention": namingConvention,
      "no-warning-comments": "error",
      "no-inline-comments": "error",
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
