# ESLint Config Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/eslint-config` (`@repo/eslint-config`)

## Overview

Shared ESLint flat config presets for consistent linting across the monorepo.

## Key Changes

- ESLint 9 flat config format (from legacy `.eslintrc`)
- Export names changed: `nest-js`, `next-js`, `base`
- TypeScript-aware rules enabled by default
- Prettier integration via `eslint-config-prettier`
- Import sorting via `eslint-plugin-simple-import-sort`

## Migration Steps

1. Update ESLint to v9+ in root package.json
2. Replace `.eslintrc.*` files with `eslint.config.mjs`
3. Import presets: `import { nestJs } from '@repo/eslint-config/nest-js'`
4. Remove deprecated plugin configurations
5. Fix any new lint errors from updated rules
6. Verify lint passes: `pnpm lint`
7. Update CI pipeline lint commands if needed
