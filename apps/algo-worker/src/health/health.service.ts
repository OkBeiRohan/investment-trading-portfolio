/**
 * Health Check Service
 * Monitors application health and database connections
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { QuestDBService } from '@repo/database';
import { RedisService } from '@repo/database';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    mongodb: HealthCheckResult;
    questdb: HealthCheckResult;
    redis: HealthCheckResult;
    models: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly questdbService: QuestDBService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Basic health check
   */
  async check(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Comprehensive readiness check
   */
  async readinessCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkMongoDB(),
      this.checkQuestDB(),
      this.checkRedis(),
      this.checkModels(),
    ]);

    const [mongodb, questdb, redis, models] = checks.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : ({
            status: 'unhealthy',
            error: result.reason?.message,
          } as HealthCheckResult),
    );

    // Determine overall status
    const allHealthy = [mongodb, questdb, redis, models].every(
      (check) => check.status === 'healthy',
    );
    const someUnhealthy = [mongodb, questdb, redis, models].some(
      (check) => check.status === 'unhealthy',
    );

    const status = allHealthy ? 'ok' : someUnhealthy ? 'degraded' : 'down';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        mongodb,
        questdb,
        redis,
        models,
      },
    };
  }

  /**
   * Check MongoDB connection
   */
  private async checkMongoDB(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      if (this.mongoConnection.readyState !== 1) {
        return {
          status: 'unhealthy',
          error: 'MongoDB not connected',
          details: { readyState: this.mongoConnection.readyState },
        };
      }

      // Ping MongoDB
      await this.mongoConnection.db?.admin().ping();

      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        details: {
          database: this.mongoConnection.name,
          collections: this.mongoConnection.db
            ? (await this.mongoConnection.db.listCollections().toArray()).length
            : 0,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check QuestDB connection
   */
  private async checkQuestDB(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = await this.questdbService.healthCheck();

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          error: 'QuestDB connection failed',
        };
      }

      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        details: {
          host: this.configService.get('questdb.host'),
          port: this.configService.get('questdb.port'),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const isHealthy = await this.redisService.healthCheck();

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          error: 'Redis connection failed',
        };
      }

      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        details: {
          host: this.configService.get('redis.host'),
          port: this.configService.get('redis.port'),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check if ML models are loaded
   */
  private async checkModels(): Promise<HealthCheckResult> {
    try {
      // TODO: Implement actual model loader check
      // For now, check if model paths exist
      const modelPaths = [
        this.configService.get('trading.models.xgboost.path'),
        this.configService.get('trading.models.cnnLstm.path'),
        this.configService.get('trading.models.ginn.garchPath'),
        this.configService.get('trading.models.svm.path'),
        this.configService.get('trading.models.stacking.path'),
      ];

      return {
        status: 'healthy',
        details: {
          configured: modelPaths.filter(Boolean).length,
          total: 5,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}
