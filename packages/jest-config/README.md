# @repo/jest-config

Shared Jest testing configuration for the monorepo.

## Overview

**Purpose**: Centralized Jest configuration for consistent testing across all apps and packages

## Installation

This package is part of the monorepo. Import in your app's `jest.config.ts`:

```typescript
// apps/api/jest.config.ts
import type { Config } from "jest";
import baseConfig from "@repo/jest-config";

const config: Config = {
  ...baseConfig,
  displayName: "api",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/test/**/*.e2e-spec.ts"],
};

export default config;
```

## Features

- ✅ TypeScript support via `ts-jest`
- ✅ ESM module support
- ✅ Coverage collection
- ✅ Consistent test patterns
- ✅ Path mapping support

## Base Configuration

```typescript
// packages/jest-config/src/index.ts
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/main.ts",
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Usage Examples

### NestJS App (API, Algo-Worker, etc.)

```typescript
// apps/api/jest.config.ts
import type { Config } from "jest";
import baseConfig from "@repo/jest-config";

const config: Config = {
  ...baseConfig,
  displayName: "api",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
```

### Package

```typescript
// packages/database/jest.config.ts
import type { Config } from "jest";
import baseConfig from "@repo/jest-config";

const config: Config = {
  ...baseConfig,
  displayName: "database",
  rootDir: ".",
};

export default config;
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm --filter api test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e
```

## Coverage Thresholds

Default thresholds (can be overridden per app):

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Stack

- Jest
- ts-jest (TypeScript support)
- TypeScript

## Contributing

Maintain consistent testing patterns across the monorepo.
