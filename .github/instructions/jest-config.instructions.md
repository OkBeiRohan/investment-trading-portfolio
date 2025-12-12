---
applyTo: "packages/jest-config/**"
---

# GitHub Copilot Instructions - Jest Config

## Role & Context

You are working on **@repo/jest-config** - shared Jest testing configurations.

## Package Overview

**Purpose**: Consistent testing setup across monorepo
**Exports**: Jest preset for NestJS and Node.js packages

## Usage

```javascript
// jest.config.ts
import type { Config } from 'jest';
import baseConfig from '@repo/jest-config';

const config: Config = {
  ...baseConfig,
  displayName: 'my-app',
  rootDir: '.',
};

export default config;
```

## Configuration

- TypeScript support via ts-jest
- Code coverage collection
- ESM module support
- Mock file transformations

## When Making Changes

1. ✅ Test across all apps
2. ✅ Update transformer configurations
3. ✅ Document any new test utilities

