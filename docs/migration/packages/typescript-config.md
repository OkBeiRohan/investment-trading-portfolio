# TypeScript Config Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/typescript-config` (`@repo/typescript-config`)

## Overview

Shared TypeScript configuration presets for consistent compiler settings across the monorepo.

## Key Changes

- TypeScript 5.8+ with `--erasableSyntaxOnly` support
- Strict mode enabled in all presets
- Path aliases configured for monorepo packages
- Separate presets: `base`, `nextjs`, `nestjs`, `library`
- `moduleResolution: "bundler"` as default

## Migration Steps

1. Update TypeScript to 5.8+ in root package.json
2. Extend shared config: `"extends": "@repo/typescript-config/base"`
3. Remove duplicated compiler options from local `tsconfig.json`
4. Verify path aliases resolve correctly
5. Run type-check: `pnpm tsc --noEmit`
6. Fix any new type errors from stricter settings
7. Verify build output in all packages
