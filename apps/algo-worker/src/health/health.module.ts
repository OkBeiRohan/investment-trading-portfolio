/**
 * Health Check Module
 * Provides health monitoring endpoints
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { QuestDBModule, RedisModule } from '@repo/database';

@Module({
  imports: [QuestDBModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
