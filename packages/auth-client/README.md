# @repo/auth-client

Client-side authentication utilities for React/Next.js applications.

## Overview

This package provides the Better Auth client instance and related utilities for use in browser/Next.js environments. It is separated from `@repo/authentication` to avoid pulling React/Next.js dependencies into server-side applications.

## Usage

```typescript
import { authClient } from "@repo/auth-client";

// Use in React components or Next.js pages
const { data: session } = authClient.useSession();
```

## Architecture

- **Client-only**: Contains only browser-side code
- **React/Next.js**: Requires React and Next.js as peer dependencies
- **Better Auth Client**: Configured singleton instance

## Dependencies

- `better-auth` - Core authentication client
- `@better-auth/passkey` - Passkey authentication plugin
- Peer dependencies: `react`, `next`
