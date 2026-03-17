# Notification Service Migration Guide

> **Last Updated**: March 17, 2026  
> **Package**: `services/notification-service`  
> **Status**: Scaffolded

## Overview

Multi-channel alerting service supporting email, SMS, push notifications, and Telegram for trade alerts, portfolio updates, and system events.

## Key Dependencies

- NestJS 11
- BullMQ (Redis-backed job queue)
- Nodemailer (email)
- Twilio SDK (SMS)
- Firebase Admin SDK (push)
- Telegram Bot API

## Key Changes

- Auth migrated from JWT to Better Auth
- Job queue upgraded from Bull to BullMQ
- User notification preferences stored in MongoDB
- Rate limiting per channel per user
- Redis Streams for real-time event ingestion

## Migration Steps

1. Update NestJS to v11
2. Replace Bull with BullMQ for job processing
3. Replace JWT auth with Better Auth guards
4. Configure notification channels in MongoDB `notification_configs`
5. Verify email delivery with test SMTP
6. Verify SMS delivery in sandbox mode
7. Test push notifications end-to-end
8. Run test suite: `pnpm test`
