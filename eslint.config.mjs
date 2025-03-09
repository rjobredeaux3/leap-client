import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: ["**/.eslintrc.js"],
    },
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:jsdoc/recommended-typescript",
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            parser: tsParser,
        },

        rules: {
            eqeqeq: [
                "error",
                "always",
                {
                    null: "ignore",
                },
            ],

            quotes: [
                "error",
                "double",
                {
                    allowTemplateLiterals: true,
                },
            ],

            "jsdoc/tag-lines": 0,
            "jsdoc/check-param-names": 0,
            "jsdoc/check-tag-names": 0,
            "jsdoc/no-undefined-types": 0,
            "jsdoc/require-description": 1,
            "jsdoc/empty-tags": 0,
        },
    },
    {
        files: ["**/*.test.ts"],

        rules: {
            "@typescript-eslint/no-explicit-any": 0,
            "@typescript-eslint/no-var-requires": 0,
            "@typescript-eslint/ban-types": 0,
        },
    },
    {
        files: ["./src/Discovery.ts"],

        rules: {
            "@typescript-eslint/no-explicit-any": 0,
        },
    },
];
