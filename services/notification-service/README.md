# Notification Service

> **Multi-channel notification service for trading alerts, system events, and wealth insights.**

**Port**: 50054 (gRPC)  
**Last Updated**: March 17, 2026

---

## Purpose

The Notification Service handles all outbound notifications:

1. **Trading Alerts**: Order fills, position updates, risk warnings
2. **System Events**: Service health, latency degradation, circuit breakers
3. **Wealth Insights**: Daily summaries, spending alerts, goal milestones

### What This Service Does

- ✅ Send email notifications (SMTP/SendGrid)
- ✅ Send SMS alerts (Twilio)
- ✅ Send push notifications (Firebase/APNS)
- ✅ Subscribe to Redis events from other services
- ✅ Rate limit notifications per user
- ✅ User preference management (channels, quiet hours)

### What This Service Should NOT Do

- ❌ Trading decisions
- ❌ ML inference
- ❌ Market data processing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SERVICE (NestJS)                             │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │ Redis Pub/Sub   │ →  │ Event Router    │ →  │ Channel         │         │
│   │ (Events)        │    │ (Templates)     │    │ Dispatcher      │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                          ↓                   │
│                          ┌────────────────────────────────────────────────┐ │
│                          │ Channels: Email | SMS | Push | Slack | Discord │ │
│                          └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Types

### Trading Events

| Event | Channel | Priority |
|-------|---------|----------|
| `order:filled` | Email, Push | High |
| `order:rejected` | Email, Push, SMS | Critical |
| `position:opened` | Push | Medium |
| `position:closed` | Email, Push | Medium |
| `risk:warning` | Email, Push, SMS | Critical |
| `circuit:breaker` | Email, SMS, Slack | Critical |

### Wealth Events

| Event | Channel | Priority |
|-------|---------|----------|
| `daily:summary` | Email | Low |
| `spending:alert` | Push | Medium |
| `goal:milestone` | Email, Push | Medium |
| `bill:reminder` | Push | Medium |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Development
pnpm dev

# Production
pnpm build
pnpm start:prod
```

---

## Configuration

### Environment Variables

```bash
# Email (SendGrid)
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=alerts@quantum-trades.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Push (Firebase)
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key

# Redis
REDIS_URL=redis://localhost:6379
```

---

## API Endpoints

### Send Notification

```typescript
POST /notifications/send
{
  "userId": "user123",
  "type": "order:filled",
  "data": {
    "symbol": "NIFTY24JAN18000CE",
    "quantity": 50,
    "price": 125.50
  },
  "channels": ["email", "push"]
}
```

### User Preferences

```typescript
GET /notifications/preferences/:userId
PUT /notifications/preferences/:userId
{
  "email": true,
  "push": true,
  "sms": false,
  "quietHours": {
    "start": "22:00",
    "end": "08:00"
  },
  "criticalOnly": false
}
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@repo/database` | MongoDB for user preferences |
| `@repo/schema` | Type definitions |
| `@sendgrid/mail` | Email delivery |
| `twilio` | SMS delivery |
| `firebase-admin` | Push notifications |

---

## Related Documentation

- [algo-worker README](../../apps/algo-worker/README.md) - Trading engine (event source)
- [wealth-management README](../wealth-management/README.md) - Wealth events

---

**Status**: Active  
**Technology**: NestJS, Redis, SendGrid, Twilio, Firebase
