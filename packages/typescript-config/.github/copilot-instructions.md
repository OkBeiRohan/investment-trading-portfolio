# GitHub Copilot Instructions - TypeScript Config

## Role & Context

You are working on **@repo/typescript-config** - shared TypeScript configurations.

## Package Overview

**Purpose**: Consistent TypeScript settings across monorepo
**Exports**: `base.json`, `nestjs.json`, `nextjs.json`, `react-library.json`

## Usage

Apps extend the appropriate config:

```json
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

## Configuration

All configs enforce:

- Strict mode enabled
- No implicit any
- Strict null checks
- ESNext target
- Path aliases support

## When Making Changes

1. ✅ Test compilation across all apps
2. ✅ Version bump for breaking changes
3. ✅ Document compiler option changes
