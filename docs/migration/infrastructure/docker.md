# Docker Infrastructure Migration Guide

> **Last Updated**: March 17, 2026  
> **Path**: `infrastructure/docker`

## Overview

Docker Compose configuration and Dockerfiles for local development and production deployment.

## Key Changes

- Base image updated to `node:20-slim` (Node.js 18 dropped)
- Multi-stage builds for all services
- QuestDB, MongoDB 8.0, Redis 7+ in Compose
- Grafana LGTM stack in separate Compose profile
- `data-processor` service removed from Compose
- Health checks added for all services

## Migration Steps

1. Update base images in all Dockerfiles to `node:20-slim`
2. Remove `data-processor` service from `docker-compose.yml`
3. Add Grafana LGTM services (or use `observability` profile)
4. Update MongoDB image to `mongo:8.0`
5. Update Redis image to `redis:7-alpine`
6. Verify all services start: `docker compose up -d`
7. Test inter-service connectivity
8. Verify health checks pass: `docker compose ps`
