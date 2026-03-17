# @repo/typescript-config

Shared TypeScript configurations for the monorepo.

## Overview

**Purpose**: Centralized TypeScript compiler configurations ensuring consistency and type safety

## Configurations

### 1. `base.json` - Base Configuration

Shared by all packages. Enables strict type checking.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### 2. `nestjs.json` - NestJS Apps

For backend apps (api, algo-worker, market-feeder, data-processor).

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "incremental": true,
    "removeComments": true
  }
}
```

### 3. `nextjs.json` - Next.js Apps

For frontend apps (web).

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 4. `react-library.json` - React Libraries

For React component libraries (if any).

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

## Usage

### NestJS App

```json
// apps/api/tsconfig.json
{
  "extends": "@repo/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Next.js App

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Shared Package

```json
// packages/database/tsconfig.json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

## Strict Mode Enforcement

All configurations enable **strict mode** to catch errors at compile time:

- `strict: true` - Enable all strict type-checking options
- `noImplicitAny: true` - Disallow implicit `any` types
- `strictNullChecks: true` - Catch null/undefined errors
- `strictFunctionTypes: true` - Strict function type checking
- `strictBindCallApply: true` - Strict bind/call/apply
- `strictPropertyInitialization: true` - Class properties must be initialized

## Key Features

- ✅ Strict type checking across all apps
- ✅ Consistent compiler options
- ✅ ESNext target for modern JavaScript
- ✅ Declaration maps for better debugging
- ✅ Source maps enabled
- ✅ Decorator support for NestJS

## Benefits

1. **Type Safety**: Catch errors at compile time
2. **Consistency**: Same compiler options everywhere
3. **Maintainability**: Update configs in one place
4. **IDE Support**: Better IntelliSense and autocomplete

## Stack

- TypeScript 5.x

## Contributing

When adding new compiler options, consider their impact on all apps using this config.

---

**Last Updated**: March 17, 2026
