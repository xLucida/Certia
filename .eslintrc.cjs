module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./client/tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: ["@typescript-eslint", "react-hooks", "tailwindcss"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  settings: {
    tailwindcss: {
      callees: ["cn"],
      config: "tailwind.config.ts",
    },
  },
  rules: {
    "tailwindcss/no-custom-classname": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", "server/dist", "client/dist"],
};
