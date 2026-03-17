# Jest Config Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/jest-config` (`@repo/jest-config`)

## Overview

Shared Jest configuration presets for unit and integration testing across the monorepo.

## Key Changes

- Jest 30 support (from 29)
- `ts-jest` ESM mode enabled by default
- Coverage thresholds configurable per package
- MongoDB in-memory server for integration tests
- Custom matchers for financial assertions

## Migration Steps

1. Update Jest to v30 in root package.json
2. Update `ts-jest` to latest compatible version
3. Import shared config: `import { baseConfig } from '@repo/jest-config'`
4. Migrate any custom `jest.config.ts` to extend shared preset
5. Verify all test suites pass: `pnpm test`
6. Check coverage thresholds meet requirements
7. Update CI test commands if needed
