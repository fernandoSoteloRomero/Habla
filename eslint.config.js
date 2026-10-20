import { defineConfig } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

// Mismas reglas que CafeteriaV2
const sharedRules = {
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "warn",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-imports": "error",
};

export default defineConfig(
  {
    // components/ui es codigo generado por shadcn-vue, no se lintea
    ignores: [
      "dist/**",
      "dev-dist/**",
      "node_modules/**",
      "public/**",
      "supabase/**",
      "src/components/ui/**",
      "*.config.js",
    ],
  },

  tseslint.configs.strict,
  pluginVue.configs["flat/recommended"],

  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: "module",
        ecmaVersion: "latest",
        extraFileExtensions: [".vue"],
      },
      globals: globals.browser,
    },
    rules: {
      // Vue: estructura y estilo
      "vue/multi-word-component-names": "error",
      "vue/component-api-style": ["error", ["script-setup", "composition"]],
      "vue/define-props-declaration": ["error", "type-based"],
      "vue/define-emits-declaration": ["error", "type-based"],

      // Vue: relacion script <-> template
      "vue/no-unused-vars": "error",
      "vue/no-undef-components": [
        "error",
        { ignorePatterns: ["RouterView", "RouterLink"] },
      ],
      "vue/no-unused-components": "error",

      ...sharedRules,
    },
  },

  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: sharedRules,
  },

  // Las rutas usan () => import(...) (lazy load); tiparlas no aporta nada
  {
    files: ["src/router/**/*.ts"],
    rules: { "@typescript-eslint/explicit-function-return-type": "off" },
  },

  // Debe ir al final: apaga las reglas de formato que chocan con Prettier
  prettierConfig,
);
