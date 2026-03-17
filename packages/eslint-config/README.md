# @repo/eslint-config

Shared ESLint configurations for the monorepo.

## Overview

**Purpose**: Centralized linting rules ensuring code quality and consistency across all apps and packages

## Configurations

### 1. `base.js` - Base Configuration

Core ESLint rules shared by all projects.

```javascript
module.exports = {
  extends: ["eslint:recommended", "prettier"],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": "warn",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
```

### 2. `nest-js.js` - NestJS Apps

For backend apps (api, algo-worker, market-feeder, data-processor).

```javascript
module.exports = {
  extends: ["./base.js", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
```

### 3. `next-js.js` - Next.js Apps

For frontend apps (web).

```javascript
module.exports = {
  extends: [
    "./base.js",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "next/core-web-vitals",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  rules: {
    "react/react-in-jsx-scope": "off", // Not needed in Next.js 13+
    "@typescript-eslint/no-explicit-any": "error",
  },
};
```

### 4. `library.js` - Shared Packages

For packages (database, schema, market-sdk, etc.).

```javascript
module.exports = {
  extends: ["./base.js", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
  },
};
```

### 5. `react-internal.js` - React Components

For internal React component libraries.

```javascript
module.exports = {
  extends: [
    "./base.js",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  settings: {
    react: {
      version: "detect",
    },
  },
};
```

## Usage

### NestJS App

```javascript
// apps/api/eslint.config.mjs
import nestConfig from "@repo/eslint-config/nest-js";

export default [
  ...nestConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
```

### Next.js App

```javascript
// apps/web/eslint.config.mjs
import nextConfig from "@repo/eslint-config/next-js";

export default [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
```

### Shared Package

```javascript
// packages/database/eslint.config.mjs
import libraryConfig from "@repo/eslint-config/library";

export default [
  ...libraryConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
```

## Running ESLint

```bash
# Lint all code
pnpm lint

# Lint specific app
pnpm --filter api lint

# Fix auto-fixable issues
pnpm lint:fix

# Check types and lint
pnpm type-check && pnpm lint
```

## Key Rules

### TypeScript Rules

- `@typescript-eslint/no-explicit-any`: **ERROR** - No `any` types allowed
- `@typescript-eslint/no-unused-vars`: **ERROR** - No unused variables (except `_` prefix)
- `@typescript-eslint/explicit-module-boundary-types`: **OFF** - Type inference preferred

### General Rules

- `no-console`: **WARN** - Use proper logging instead
- `no-unused-vars`: **ERROR** - Clean up unused code
- `prefer-const`: **ERROR** - Use `const` when possible

### React Rules (Next.js Apps)

- `react/react-in-jsx-scope`: **OFF** - Not needed in Next.js 13+
- `react-hooks/rules-of-hooks`: **ERROR** - Follow Hooks rules
- `react-hooks/exhaustive-deps`: **WARN** - Check effect dependencies

## Integration with Prettier

All configs extend Prettier to avoid conflicts:

```javascript
extends: ['prettier'] // Disables ESLint rules that conflict with Prettier
```

## CI/CD Integration

```yaml
# .github/workflows/lint.yml
- name: Lint
  run: pnpm lint

- name: Type Check
  run: pnpm type-check
```

## Benefits

1. **Consistency**: Same linting rules across all apps
2. **Code Quality**: Catch bugs early
3. **Type Safety**: Enforce strict TypeScript usage
4. **Maintainability**: Update rules in one place

## Stack

- ESLint 8.x
- @typescript-eslint
- eslint-config-prettier
- eslint-config-next (for Next.js)

## Contributing

When adding new rules, consider their impact on all projects using this config.

---

**Last Updated**: March 17, 2026
