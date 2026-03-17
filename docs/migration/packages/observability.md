# Observability Package Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `packages/observability` (`@repo/observability`)

## Overview

OpenTelemetry instrumentation package providing traces, metrics, and logs for all services.

## Key Changes

- OpenTelemetry SDK upgraded to latest stable
- OTLP exporter configured for Grafana LGTM stack
- Auto-instrumentation for NestJS, MongoDB, Redis, HTTP
- Custom spans for trading operations and ML inference
- Structured logging with Pino + OTLP log bridge

## Migration Steps

1. Update `@opentelemetry/*` packages to latest stable
2. Configure OTLP endpoint for Grafana Alloy/Collector
3. Add `@repo/observability` to each service
4. Initialize tracing in service bootstrap (`main.ts`)
5. Verify traces appear in Grafana Tempo
6. Verify metrics appear in Grafana Mimir
7. Verify logs appear in Grafana Loki
