# Data Processor Migration Guide

> **Last Updated**: March 17, 2026  
> **Status**: DEPRECATED

## Deprecation Notice

The `data-processor` service has been fully superseded by:
- **`@repo/compute-engine`** (Rust NAPI-RS) -- feature computation at ingestion time
- **`services/market-feeder`** -- orchestrates data collection and feature computation

## Migration Steps

1. Remove `data-processor` from Docker Compose
2. Remove `data-processor` from PM2 ecosystem config
3. Ensure `market-feeder` has `@repo/compute-engine` as dependency
4. Verify features are computed during ingestion (check QuestDB `instrument_features`)
5. Remove `data-processor` service directory (optional, retained for reference)
