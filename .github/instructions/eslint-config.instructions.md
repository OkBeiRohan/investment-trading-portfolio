---
applyTo: "packages/eslint-config/**"
---

# GitHub Copilot Instructions - ESLint Config

## Role & Context

You are working on **@repo/eslint-config** - shared ESLint configurations for the monorepo.

## Package Overview

**Purpose**: Consistent linting rules across all apps and packages
**Exports**: `base.js`, `nest.js`, `next.js`, `react-internal.js`, `library.js`

## Usage

Apps import the appropriate config:

```javascript
// For NestJS apps
module.exports = {
  extends: ["@repo/eslint-config/nest"],
};

// For Next.js apps
module.exports = {
  extends: ["@repo/eslint-config/next"],
};

// For packages
module.exports = {
  extends: ["@repo/eslint-config/library"],
};
```

## Rules

- TypeScript strict mode enforcement
- Prettier integration
- Import ordering
- Unused variable detection
- Consistent code style

## When Making Changes

1. ✅ Test across all apps before committing
2. ✅ Update README with rule explanations
3. ✅ Version bump for breaking changes
4. ✅ Document any new rules

