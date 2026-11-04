import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // La app carga datos del cliente en efectos; la regla del compilador de React
      // es demasiado estricta para ese patrón con Supabase.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["components/ContractPdf.tsx"],
    rules: {
      // <Image> aquí es de @react-pdf/renderer, no un <img> del DOM.
      "jsx-a11y/alt-text": "off",
    },
  },
  {
    files: ["components/ContractForm.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
