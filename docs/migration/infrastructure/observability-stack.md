# Observability Stack Migration Guide

> **Last Updated**: March 17, 2026  
> **Path**: `infrastructure/observability`

## Overview

Grafana LGTM (Loki, Grafana, Tempo, Mimir) stack for centralized observability across all services.

## Key Changes

- Grafana LGTM all-in-one container for local development
- Grafana Alloy as OpenTelemetry collector
- Loki for log aggregation (replaces console-only logging)
- Tempo for distributed tracing
- Mimir for metrics storage (Prometheus-compatible)
- Pre-configured dashboards for trading metrics

## Migration Steps

1. Add LGTM services to Docker Compose (or use profile)
2. Configure Grafana Alloy to receive OTLP from services
3. Configure Loki data source in Grafana
4. Configure Tempo data source in Grafana
5. Configure Mimir data source in Grafana
6. Import pre-built dashboards
7. Verify traces, logs, and metrics flow end-to-end
8. Set up alerting rules for critical trading events
