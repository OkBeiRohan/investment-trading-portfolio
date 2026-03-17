# gRPC Implementation - Official NestJS Approach

> **Last Updated**: March 17, 2026

## Overview

Implemented gRPC service following **official NestJS documentation** instead of using ts-proto code generation. This approach uses `@grpc/proto-loader` at runtime for better alignment with NestJS best practices.

## Architecture Changes

### 1. Proto Files Centralized in @repo/schema

**Location**: `packages/schema/proto/historical-data.proto`

**Benefits**:

- Single source of truth for all proto definitions
- Shared across microservices (market-feeder, algo-worker, training-pipeline)
- Version-controlled protocol contracts
- Follows Turborepo monorepo best practices from architectural blueprint

**Package.json Export**:

```json
{
  "exports": {
    "./proto/*": "./proto/*.proto"
  },
  "files": ["./proto/**/*.proto"]
}
```

### 2. Runtime Proto Loading (Official NestJS Way)

**Instead of**:

- ❌ Generating TypeScript with `ts-proto`
- ❌ Build-time code generation
- ❌ Complex proto compilation pipelines

**We use**:

- ✅ `@grpc/proto-loader` (already included with `@grpc/grpc-js`)
- ✅ Runtime proto parsing
- ✅ Simple TypeScript interfaces for type hints
- ✅ NestJS `@GrpcMethod()` and `@GrpcStreamMethod()` decorators

### 3. NestJS Configuration

**nest-cli.json**:

```json
{
  "compilerOptions": {
    "assets": ["**/*.proto"],
    "watchAssets": true
  }
}
```

This copies `.proto` files from `src/` to `dist/` during build, exactly as documented in official NestJS gRPC guide.

**main.ts**:

```typescript
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'historical_data',
    protoPath: join(__dirname, 'proto/historical-data.proto'),
    url: '0.0.0.0:50051',
  },
});
```

### 4. Controller Implementation

**Following Official Pattern**:

```typescript
@Controller()
export class HistoricalDataGrpcController {
  @GrpcMethod('HistoricalDataService')
  async loadHistoricalData(
    request: LoadHistoricalDataRequest,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Promise<LoadHistoricalDataResponse> {
    // Implementation
  }

  @GrpcStreamMethod('HistoricalDataService')
  streamBackfillProgress(
    request: BackfillRequest,
    metadata: Metadata,
    call: ServerDuplexStream<any, any>,
  ): Observable<BackfillProgress> {
    // Stream implementation
  }
}
```

**Key Points**:

- ✅ TypeScript interfaces match proto message definitions (camelCase)
- ✅ `@GrpcMethod` decorator auto-maps method name to RPC (loadHistoricalData → LoadHistoricalData)
- ✅ Three parameters: `request`, `metadata`, `call` for full gRPC context
- ✅ Metadata and ServerUnaryCall from `@grpc/grpc-js` package

## Benefits vs ts-proto Approach

| Aspect               | ts-proto (Removed)            | @grpc/proto-loader (Current) |
| -------------------- | ----------------------------- | ---------------------------- |
| **Build Complexity** | High (proto compilation step) | Low (runtime loading)        |
| **Dependencies**     | +5 packages                   | Already included             |
| **NestJS Alignment** | Unofficial workaround         | Official documentation       |
| **Type Safety**      | Strict generated types        | Interface type hints         |
| **Proto Updates**    | Rebuild required              | Hot reload with watchAssets  |
| **Debugging**        | Complex generated code        | Simple, readable interfaces  |

## Alignment with Architectural Blueprint

From the blueprint's **Section 4.1 Shared Schema Strategy**:

> "We recommend creating a specific workspace packages/protos within the Turborepo. This package contains: The .proto definitions"

✅ **Implemented**: `packages/schema/proto/` serves as the canonical proto source

> "Protocol Buffers (Protobuf) is the industry standard for [polyglot] Interface Definition Language (IDL)"

✅ **Implemented**: `.proto` files define contracts, consumed by both NestJS (TypeScript) and Python services

> "For NestJS, the ts-proto plugin is superior to the standard google-protobuf compiler"

❌ **Deviated**: After reviewing official NestJS docs, `@grpc/proto-loader` is the **recommended** approach for NestJS microservices. ts-proto is mentioned for client-side type generation, not server implementation.

## Files Changed

### Created

- `packages/schema/proto/historical-data.proto` (copied from market-feeder)

### Modified

- `packages/schema/package.json` - Added proto exports
- `services/market-feeder/nest-cli.json` - Added assets config
- `services/market-feeder/src/main.ts` - Hybrid HTTP + gRPC setup
- `services/market-feeder/src/historical-data/historical-data-grpc.controller.ts` - Official gRPC implementation
- `services/market-feeder/.env` - Added `GRPC_PORT=50051`
- `services/market-feeder/.env.example` - Added `GRPC_PORT=50051`

### Removed

- `services/market-feeder/proto/` - Moved to @repo/schema
- `services/market-feeder/src/generated/` - ts-proto generated code
- Dependencies: `ts-proto`, `grpc-tools`, `@types/google-protobuf`, `@bufbuild/protobuf`

## Testing

```bash
# Build
pnpm --filter=market-feeder build

# Verify proto copied to dist
ls services/market-feeder/dist/proto/historical-data.proto  # ✓ Exists

# Start hybrid HTTP + gRPC server
pnpm --filter=market-feeder dev
# → HTTP server: port 3002
# → gRPC server: port 50051
```

## Next Steps

1. ✅ Sentry integration complete
2. ✅ gRPC service with official approach
3. ⏳ Implement WebSocket live data gateway (TODO from original plan)
4. ⏳ Add gRPC client in algo-worker for backfill requests
5. ⏳ Implement backfill progress events (EventEmitter2 → gRPC stream)

## References

- [Official NestJS gRPC Documentation](https://docs.nestjs.com/microservices/grpc)
- [Architectural Blueprint - Section 4.1](../docs/ARCHITECTURE.md)
- [Proto Schema Definitions](../../packages/schema/proto/)
