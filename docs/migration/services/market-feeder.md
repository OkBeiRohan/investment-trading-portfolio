# Market Feeder Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/market-feeder`

## Key Changes

- Hybrid HTTP+gRPC mode (REST endpoints now reachable)
- Token injection from `AuthManagerService` before API calls
- Daily token refresh cron (08:30 IST)
- Admin-configurable instruments via MongoDB
- Feature computation reads config from MongoDB `feature_configs`

## Step-by-Step

1. Update `main.ts` for hybrid mode
2. Inject `AuthManagerService` tokens in `InstrumentSyncService`
3. Add token refresh cron service
4. Configure instruments in MongoDB
5. Verify instrument sync: `POST /ingestion/sync-instruments`
6. Verify historical backfill: `POST /ingestion/backfill`
7. Verify live data: `POST /ingestion/live/start`
8. Check QuestDB for candles and features
